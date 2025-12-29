// server/performance/providers/dynatrace.cjs
// Dynatrace Provider (v2 APIs)
// - Entities discovery (tag -> nameContains fallback)
// - Metrics query (avg KPI values)
// - Optional logs search (if enabled)

const DEFAULT_TIMEOUT_MS = 15_000;

// Node 18+ has global fetch (Node 25 OK)
async function httpJson(url, { method = "GET", headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? safeJsonParse(text, text) : null;

    if (!res.ok) {
      const msg =
        (data && (data.error?.message || data.message || data.error)) ||
        `HTTP ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function normalizeBaseUrl(baseUrl) {
  const b = String(baseUrl || "").trim();
  if (!b) return "";
  return b.replace(/\/+$/, "");
}

function dtAuthHeaders(apiToken) {
  return {
    Authorization: `Api-Token ${apiToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function pickTimeframe(config) {
  // Dynatrace metrics/query supports from/to or relative "now-15m"
  // We'll translate "timeframe" into from/to if you want later.
  // For now: use relative window via from=now-15m, to=now
  const tf = String(config?.dynatrace?.timeframe || "now-15m").trim();
  const from = tf || "now-15m";
  const to = "now";
  return { from, to };
}

/**
 * Build entitySelector for v2 entities & metrics
 * We support:
 * - tag priority (product/app/application/component/service)
 * - nameContains fallback
 *
 * Example:
 * type(SERVICE),tag(product:httpd)
 * type(HOST),entityName.contains("apache")
 */
function buildEntitySelectors({ productKey, cfg }) {
  const productsCfg = cfg?.dynatrace?.products || {};
  const prod = productsCfg[productKey] || {};

  const tagKeys = Array.isArray(cfg?.dynatrace?.entitySelector?.tagKeys)
    ? cfg.dynatrace.entitySelector.tagKeys
    : ["product", "app", "application", "component", "service"];

  const tagValue = String(prod.tagValue || "").trim();
  const nameContains = Array.isArray(prod.nameContains) ? prod.nameContains : [];

  const typeBuckets = [
    // We try multiple scopes because you said: Kubernetes + Host/PG + Service
    "SERVICE",
    "PROCESS_GROUP_INSTANCE",
    "PROCESS_GROUP",
    "KUBERNETES_CLUSTER",
    "KUBERNETES_NODE",
    "KUBERNETES_WORKLOAD",
    "HOST",
  ];

  const selectors = [];

  // 1) Tag based selectors
  if (tagValue) {
    for (const t of typeBuckets) {
      for (const k of tagKeys) {
        selectors.push(`type(${t}),tag(${k}:${escapeSelectorValue(tagValue)})`);
      }
    }
  }

  // 2) Name contains fallback
  if (cfg?.dynatrace?.entitySelector?.nameContainsFallback !== false) {
    for (const t of typeBuckets) {
      for (const needle of nameContains) {
        const n = String(needle || "").trim();
        if (!n) continue;
        selectors.push(`type(${t}),entityName.contains("${escapeQuotes(n)}")`);
      }
    }
  }

  // Dedup
  return Array.from(new Set(selectors));
}

function escapeQuotes(s) {
  return String(s).replace(/"/g, '\\"');
}

function escapeSelectorValue(s) {
  // tag selector: tag(key:value) - safest is keep simple, strip spaces
  return String(s).trim().replace(/\s+/g, "_");
}

async function findEntities({ baseUrl, apiToken, entitySelector }) {
  // v2 Entities API:
  // GET /api/v2/entities?entitySelector=...&pageSize=...
  const url = new URL(`${baseUrl}/api/v2/entities`);
  url.searchParams.set("entitySelector", entitySelector);
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("fields", "entityId,displayName,type");

  const data = await httpJson(url.toString(), {
    headers: dtAuthHeaders(apiToken),
  });

  const list = Array.isArray(data?.entities) ? data.entities : [];
  return list;
}

/**
 * Metrics query:
 * GET /api/v2/metrics/query?metricSelector=...&entitySelector=...&from=...&to=...
 * We will return a single "avg" value if possible.
 */
async function queryMetricAvg({ baseUrl, apiToken, metricId, entitySelector, from, to }) {
  const url = new URL(`${baseUrl}/api/v2/metrics/query`);

  // We enforce "avg" if not specified
  // Dynatrace metricSelector often supports :avg
  // If user already gave "something:avg" we keep it.
  const ms = String(metricId || "").trim();
  if (!ms) return null;

  const metricSelector = ms.includes(":avg") || ms.includes(":sum") || ms.includes(":max") || ms.includes(":min")
    ? ms
    : `${ms}:avg`;

  url.searchParams.set("metricSelector", metricSelector);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("entitySelector", entitySelector);

  const data = await httpJson(url.toString(), {
    headers: dtAuthHeaders(apiToken),
  });

  // Response shape:
  // result[0].data[0].values[] or sometimes nested series
  // We'll compute average of returned points
  const result = Array.isArray(data?.result) ? data.result : [];
  const series = result.flatMap((r) => Array.isArray(r?.data) ? r.data : []);
  const values = series.flatMap((s) => Array.isArray(s?.values) ? s.values : []);
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));

  if (!nums.length) return null;

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Number(avg.toFixed(2));
}

/**
 * Optional logs (Dynatrace Logs v2)
 * POST /api/v2/logs/search
 * If logs API not enabled in tenant, this can fail. We'll swallow if disabled.
 */
async function queryLogs({ baseUrl, apiToken, productKey, from, to, cfg }) {
  const logsCfg = cfg?.dynatrace?.logs || {};
  if (!logsCfg.enabled) return [];

  const query = String(logsCfg.queryTemplate || "").trim();
  // Query template example:
  // 'tag(product:{product}) OR content:{product}'
  // We'll do basic replace.
  const q = (query || `content:"${productKey}"`).replaceAll("{product}", productKey);

  const body = JSON.stringify({
    query: q,
    from,
    to,
    limit: Number(logsCfg.limit || 20),
  });

  try {
    const data = await httpJson(`${baseUrl}/api/v2/logs/search`, {
      method: "POST",
      headers: dtAuthHeaders(apiToken),
      body,
      timeoutMs: Number(logsCfg.timeoutMs || DEFAULT_TIMEOUT_MS),
    });

    const logs = Array.isArray(data?.logs) ? data.logs : [];
    return logs.slice(0, 20).map((l) => ({
      ts: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString(),
      level: l.loglevel || l.severity || "INFO",
      message: l.content || l.message || JSON.stringify(l).slice(0, 500),
    }));
  } catch (e) {
    // Don't break the whole payload if logs fail
    return [];
  }
}

/**
 * Top endpoints:
 * Dynatrace can provide "key requests" metrics etc. but that mapping varies a lot.
 * We'll keep the contract but return [] for now (we’ll implement once we confirm your DT model).
 */
async function queryTopEndpoints(/* { ... } */) {
  return [];
}

function getMetricMap(cfg, productKey) {
  // allow per-product overrides later:
  // cfg.dynatrace.products[productKey].kpisOverride = { cpu: "..." }
  const base = cfg?.dynatrace?.kpis || {};
  const prod = (cfg?.dynatrace?.products || {})[productKey] || {};
  const ov = prod.kpisOverride || {};
  return { ...base, ...ov };
}

/**
 * Main provider interface:
 * fetchAll({ config, products }) => { [product]: payload }
 */
async function fetchAll({ config, products }) {
  const baseUrl = normalizeBaseUrl(config?.dynatrace?.baseUrl);
  const apiToken = String(config?.dynatrace?.apiToken || "").trim();

  if (!baseUrl || !apiToken) {
    // missing config => do NOT throw; return empty payloads
    const out = {};
    for (const p of products || []) {
      out[p] = {
        product: p,
        kpis: {},
        topEndpoints: [],
        errorLog: [],
        _note: "Dynatrace config missing (baseUrl/apiToken). Provider skipped.",
      };
    }
    return out;
  }

  const { from, to } = pickTimeframe(config);

  const out = {};
  for (const productKey of products || []) {
    const selectors = buildEntitySelectors({ productKey, cfg: config });
    let chosenSelector = selectors[0] || "";

    // Try selectors until we find at least one entity
    let entities = [];
    for (const sel of selectors) {
      try {
        const list = await findEntities({ baseUrl, apiToken, entitySelector: sel });
        if (list.length > 0) {
          entities = list;
          chosenSelector = sel;
          break;
        }
      } catch {
        // ignore and continue
      }
    }

    // Build KPI values
    const metricMap = getMetricMap(config, productKey);
    const kpis = {};

    // We will query metrics against "chosenSelector" even if entities empty.
    // If empty, DT usually returns nothing => null
    for (const [kpiName, metricId] of Object.entries(metricMap)) {
      try {
        const v = await queryMetricAvg({
          baseUrl,
          apiToken,
          metricId,
          entitySelector: chosenSelector,
          from,
          to,
        });
        if (v !== null) kpis[kpiName] = v;
      } catch {
        // ignore single KPI failure
      }
    }

    const topEndpoints = await queryTopEndpoints({
      baseUrl,
      apiToken,
      productKey,
      cfg: config,
      from,
      to,
      entitySelector: chosenSelector,
    });

    const errorLog = await queryLogs({
      baseUrl,
      apiToken,
      productKey,
      cfg: config,
      from,
      to,
    });

    out[productKey] = {
      product: productKey,
      scope: {
        entitySelector: chosenSelector || null,
        entitiesFound: entities.length,
        sampleEntities: entities.slice(0, 5).map((e) => ({
          id: e.entityId,
          name: e.displayName,
          type: e.type,
        })),
        timeframe: { from, to },
      },
      kpis,
      topEndpoints,
      errorLog,
    };
  }

  return out;
}

module.exports = { fetchAll };