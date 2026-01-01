// server/performance/providers/dynatrace.cjs
// Dynatrace Provider (v2 APIs)
// ✅ LOG YOK: Dynatrace'ten log çekmiyoruz (errorLog her zaman []).
// ✅ ESNEK DISCOVERY: Tag standardı belirsizse çoklu tag key + nameContains fallback.
// ✅ K8S + HOST + SERVICE: birden fazla entity type üzerinde deneme yapar.

const DEFAULT_TIMEOUT_MS = 15_000;

// Node 18+ has global fetch
async function httpJson(url, { method = "GET", headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
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
  return b ? b.replace(/\/+$/, "") : "";
}

function dtAuthHeaders(apiToken) {
  return {
    Authorization: `Api-Token ${apiToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function pickTimeframe(config) {
  const tf = String(config?.dynatrace?.timeframe || "now-15m").trim();
  return { from: tf || "now-15m", to: "now" };
}

function escapeQuotes(s) {
  return String(s).replace(/"/g, '\\"');
}
function escapeSelectorValue(s) {
  return String(s).trim().replace(/\s+/g, "_");
}

/**
 * Entity discovery selectors
 */
function buildEntitySelectors({ productKey, cfg }) {
  const productsCfg = cfg?.dynatrace?.products || {};
  const prod = productsCfg[productKey] || {};

  const tagKeys = Array.isArray(cfg?.dynatrace?.entitySelector?.tagKeys)
    ? cfg.dynatrace.entitySelector.tagKeys
    : [
        "product",
        "app",
        "application",
        "component",
        "service",
        "owner",
        "team",
        "tier",
      ];

  const tagValue = String(prod.tagValue || productKey || "").trim();
  const nameContains = Array.isArray(prod.nameContains) ? prod.nameContains : [];

  const typeBuckets = Array.isArray(cfg?.dynatrace?.entitySelector?.typeBuckets)
    ? cfg.dynatrace.entitySelector.typeBuckets
    : [
        "SERVICE",
        "PROCESS_GROUP_INSTANCE",
        "PROCESS_GROUP",
        "HOST",
        "KUBERNETES_CLUSTER",
        "KUBERNETES_NODE",
        "KUBERNETES_WORKLOAD",
      ];

  const selectors = [];

  // 1) Tag based
  if (tagValue) {
    for (const t of typeBuckets) {
      for (const k of tagKeys) {
        selectors.push(`type(${t}),tag(${k}:${escapeSelectorValue(tagValue)})`);
      }
    }
  }

  // 2) nameContains fallback
  if (cfg?.dynatrace?.entitySelector?.nameContainsFallback !== false) {
    for (const t of typeBuckets) {
      for (const needle of nameContains) {
        const n = String(needle || "").trim();
        if (!n) continue;
        selectors.push(`type(${t}),entityName.contains("${escapeQuotes(n)}")`);
      }
    }
  }

  return Array.from(new Set(selectors));
}

async function findEntities({ baseUrl, apiToken, entitySelector }) {
  const url = new URL(`${baseUrl}/api/v2/entities`);
  url.searchParams.set("entitySelector", entitySelector);
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("fields", "entityId,displayName,type");

  const data = await httpJson(url.toString(), { headers: dtAuthHeaders(apiToken) });
  return Array.isArray(data?.entities) ? data.entities : [];
}

/**
 * Metrics query avg
 */
async function queryMetricAvg({ baseUrl, apiToken, metricId, entitySelector, from, to }) {
  const ms = String(metricId || "").trim();
  if (!ms) return null;

  const metricSelector =
    ms.includes(":avg") || ms.includes(":sum") || ms.includes(":max") || ms.includes(":min")
      ? ms
      : `${ms}:avg`;

  const url = new URL(`${baseUrl}/api/v2/metrics/query`);
  url.searchParams.set("metricSelector", metricSelector);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("entitySelector", entitySelector);

  const data = await httpJson(url.toString(), { headers: dtAuthHeaders(apiToken) });

  const result = Array.isArray(data?.result) ? data.result : [];
  const series = result.flatMap((r) => (Array.isArray(r?.data) ? r.data : []));
  const values = series.flatMap((s) => (Array.isArray(s?.values) ? s.values : []));
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!nums.length) return null;

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Number(avg.toFixed(2));
}

/**
 * Metrics query series
 * Return [{t: ISO, v: number}]
 */
async function queryMetricSeries({ baseUrl, apiToken, metricId, entitySelector, from, to }) {
  const ms = String(metricId || "").trim();
  if (!ms) return [];

  const metricSelector =
    ms.includes(":avg") || ms.includes(":sum") || ms.includes(":max") || ms.includes(":min")
      ? ms
      : `${ms}:avg`;

  const url = new URL(`${baseUrl}/api/v2/metrics/query`);
  url.searchParams.set("metricSelector", metricSelector);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("entitySelector", entitySelector);

  const data = await httpJson(url.toString(), { headers: dtAuthHeaders(apiToken) });

  const result = Array.isArray(data?.result) ? data.result : [];
  const series = result.flatMap((r) => (Array.isArray(r?.data) ? r.data : []));

  // timestamps[] (ms epoch) + values[]
  const bucket = new Map(); // ts -> {sum,count}

  for (const s of series) {
    const tsArr = Array.isArray(s?.timestamps) ? s.timestamps : [];
    const vArr = Array.isArray(s?.values) ? s.values : [];
    for (let i = 0; i < Math.min(tsArr.length, vArr.length); i++) {
      const ts = tsArr[i];
      const v = vArr[i];
      if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
      if (typeof v !== "number" || !Number.isFinite(v)) continue;

      const cur = bucket.get(ts) || { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      bucket.set(ts, cur);
    }
  }

  const points = Array.from(bucket.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, agg]) => ({
      t: new Date(ts).toISOString(),
      v: Number((agg.sum / Math.max(1, agg.count)).toFixed(2)),
    }));

  return points;
}

/**
 * Top endpoints:
 * ŞİMDİLİK BOŞ (contract var, veri yok).
 */
async function queryTopEndpoints() {
  return [];
}

function getMetricMap(cfg, productKey) {
  const base = cfg?.dynatrace?.kpis || {};
  const prod = (cfg?.dynatrace?.products || {})[productKey] || {};
  const ov = prod.kpisOverride || {};
  return { ...base, ...ov };
}

/**
 * fetchAll({ config, products }) => { [product]: payload }
 */
async function fetchAll({ config, products }) {
  const baseUrl = normalizeBaseUrl(config?.dynatrace?.baseUrl);
  const apiToken = String(config?.dynatrace?.apiToken || "").trim();

  if (!baseUrl || !apiToken) {
    const out = {};
    for (const p of products || []) {
      out[p] = {
        product: p,
        kpis: {},
        timeseries: {},
        topEndpoints: [],
        errorLog: [], // Dynatrace logs disabled
        _note: "Dynatrace config missing (baseUrl/apiToken). Provider skipped.",
      };
    }
    return out;
  }

  const { from, to } = pickTimeframe(config);
  const out = {};

  for (const productKey of products || []) {
    const selectors = buildEntitySelectors({ productKey, cfg: config });

    const scope = {
      discoveryStages: selectors.slice(0, 50).map((s, i) => ({
        name: `selector_${i + 1}`,
        baseSearch: s,
      })),
      discoveryProbe: [],
      discoverySelected: null,
      discoveryNote:
        "Dynatrace selector denemeleri. PROD'da tag standardı netleşince selector listesi sadeleştirilmeli.",
    };

    let chosenSelector = selectors[0] || "";
    let entities = [];

    for (const sel of selectors) {
      try {
        const list = await findEntities({ baseUrl, apiToken, entitySelector: sel });

        scope.discoveryProbe.push({
          stage: sel,
          ok: list.length > 0,
          entitiesFound: list.length,
        });

        if (list.length > 0) {
          entities = list;
          chosenSelector = sel;
          scope.discoverySelected = sel;
          break;
        }
      } catch (e) {
        scope.discoveryProbe.push({
          stage: sel,
          ok: false,
          error: String(e?.message || e),
        });
      }
    }

    const metricMap = getMetricMap(config, productKey);
    const kpis = {};
    const timeseries = {};

    // Query each KPI safely
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
        // ignore
      }
    }

    // TIMESERIES (best-effort) — only if mapped
    try {
      if (metricMap.rps) {
        const pts = await queryMetricSeries({
          baseUrl,
          apiToken,
          metricId: metricMap.rps,
          entitySelector: chosenSelector,
          from,
          to,
        });
        if (pts.length) timeseries.rps = pts;
      }
    } catch {}

    try {
      if (metricMap.latencyMs) {
        const pts = await queryMetricSeries({
          baseUrl,
          apiToken,
          metricId: metricMap.latencyMs,
          entitySelector: chosenSelector,
          from,
          to,
        });
        if (pts.length) timeseries.latencyMs = pts;
      }
    } catch {}

    try {
      if (metricMap.errorRate) {
        const pts = await queryMetricSeries({
          baseUrl,
          apiToken,
          metricId: metricMap.errorRate,
          entitySelector: chosenSelector,
          from,
          to,
        });
        if (pts.length) timeseries.errorRate = pts;
      }
    } catch {}

    const topEndpoints = await queryTopEndpoints({
      baseUrl,
      apiToken,
      productKey,
      cfg: config,
      from,
      to,
      entitySelector: chosenSelector,
    });

    out[productKey] = {
      product: productKey,
      scope: {
        ...scope,
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
      timeseries,
      topEndpoints,
      errorLog: [], // Dynatrace logs disabled
    };
  }

  return out;
}

module.exports = { fetchAll };