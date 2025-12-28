// server/performance/providers/dynatrace.cjs
// Dynatrace Provider (Metric API v2 + Entity API v2)
// Amaç: product bazlı tüm instance’ları (tag/mz/namePattern) toplayıp,
// KPI’leri "ortalama", detail için "top endpoints" gibi alanları üretmek.
// Kural: DOLUYSA kullan, BOŞSA geç. Fail etme, degrade et.

const DEFAULT_TIMEOUT_MS = 12_000;

function normStr(x) {
  return String(x ?? "").trim();
}

function isNonEmpty(x) {
  return normStr(x).length > 0;
}

function toArr(x) {
  return Array.isArray(x) ? x : [];
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
    });

    const text = await r.text().catch(() => "");
    const data = text ? JSON.parse(text) : {};

    if (!r.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${r.status}`;
      const e = new Error(msg);
      e.status = r.status;
      e.url = url;
      throw e;
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

function joinUrl(baseUrl, p) {
  const b = baseUrl.replace(/\/+$/, "");
  const path = p.startsWith("/") ? p : `/${p}`;
  return `${b}${path}`;
}

function buildHeaders(token) {
  // Dynatrace API token
  return {
    Authorization: `Api-Token ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Entity selector builder
 * Dynatrace entitySelector DSL örnekleri:
 *  type("SERVICE"),tag("product:httpd")
 *  type("PROCESS_GROUP"),entityName.contains("nginx")
 */
function entitySelectorOf({ entityType, tagKey, tagValue, namePatterns, managementZoneId }) {
  const parts = [];
  parts.push(`type("${entityType}")`);

  // Tag: key:value formatı yaygın
  if (isNonEmpty(tagKey) && isNonEmpty(tagValue)) {
    parts.push(`tag("${tagKey}:${tagValue}")`);
  }

  // Management Zone: id varsa filtrele
  if (isNonEmpty(managementZoneId)) {
    // Dynatrace DSL: mzId("xxxx") kullanımı yaygın pattern; bazı tenantlarda mzId(...) desteklenir.
    // Desteklenmezse entity listesi daha geniş gelir ama yine degrade eder.
    parts.push(`mzId("${managementZoneId}")`);
  }

  // Name patterns: contains ile OR
  const pats = toArr(namePatterns).map((x) => normStr(x)).filter(Boolean);
  if (pats.length) {
    // entityName.contains("a") OR entityName.contains("b")
    const or = pats
      .map((p) => p.replace(/\*/g, "").trim())
      .filter(Boolean)
      .map((p) => `entityName.contains("${p.replace(/"/g, '\\"')}")`)
      .join(",");
    if (or) parts.push(or);
  }

  return parts.join(",");
}

/**
 * Get Management Zone ID by name (optional)
 * Endpoint: /api/config/v1/managementZones
 */
async function resolveManagementZoneId({ baseUrl, token, mzName }) {
  const name = normStr(mzName);
  if (!name) return null;

  const url = joinUrl(baseUrl, `/api/config/v1/managementZones`);
  try {
    const data = await fetchJson(url, { headers: buildHeaders(token) });
    const list = toArr(data?.values || data);
    const found = list.find((x) => normStr(x?.name).toLowerCase() === name.toLowerCase());
    // Dynatrace config API genelde {id,name} döner
    return found?.id ? String(found.id) : null;
  } catch {
    // Degrade: mz çözülemezse null dön
    return null;
  }
}

/**
 * List entities by selector
 * Endpoint: /api/v2/entities
 */
async function listEntities({ baseUrl, token, entitySelector, pageSize = 200 }) {
  const out = [];
  let nextPageKey = null;

  while (true) {
    const qs = new URLSearchParams();
    qs.set("entitySelector", entitySelector);
    qs.set("pageSize", String(pageSize));
    if (nextPageKey) qs.set("nextPageKey", nextPageKey);

    const url = joinUrl(baseUrl, `/api/v2/entities?${qs.toString()}`);
    const data = await fetchJson(url, { headers: buildHeaders(token) });

    const ents = toArr(data?.entities);
    for (const e of ents) {
      if (e?.entityId) out.push({ id: String(e.entityId), name: String(e.displayName || "") });
    }

    nextPageKey = data?.nextPageKey ? String(data.nextPageKey) : null;
    if (!nextPageKey) break;
  }

  return out;
}

/**
 * Metrics query
 * Endpoint: /api/v2/metrics/query
 * metricSelector: builtin:service.response.time:avg
 * entitySelector: type("SERVICE"),tag("product:httpd")
 */
async function queryMetric({ baseUrl, token, metricSelector, entitySelector, from, to, resolution }) {
  const qs = new URLSearchParams();
  qs.set("metricSelector", metricSelector);
  if (isNonEmpty(entitySelector)) qs.set("entitySelector", entitySelector);
  if (isNonEmpty(from)) qs.set("from", from);
  if (isNonEmpty(to)) qs.set("to", to);
  if (isNonEmpty(resolution)) qs.set("resolution", resolution);

  const url = joinUrl(baseUrl, `/api/v2/metrics/query?${qs.toString()}`);
  return await fetchJson(url, { headers: buildHeaders(token) });
}

/**
 * Metric result -> scalar (avg) çıkarımı (degrade friendly)
 */
function extractSingleNumber(metricResp) {
  // Dynatrace response genelde:
  // {result:[{data:[{values:[..],dimensions:[..]}]}]}
  const r0 = metricResp?.result?.[0];
  const d0 = r0?.data?.[0];
  const values = toArr(d0?.values);
  if (!values.length) return null;

  // values array time-series olabilir; ortalamasını al
  const nums = values.map(safeNum).filter((x) => Number.isFinite(x));
  if (!nums.length) return null;

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Number.isFinite(avg) ? avg : null;
}

/**
 * Metric mapping (sende en son tasarladığımız modelle uyumlu)
 * NOTE: Bazı metric isimleri tenant’a göre farklı olabilir -> bu yüzden degrade.
 */
const METRICS = {
  common: {
    // Host-level (fallback)
    cpu_host: `builtin:host.cpu.usage:avg`,
    mem_host: `builtin:host.mem.usage:avg`,
    disk_host: `builtin:host.disk.used.percent:avg`,
  },
  service: {
    rps: `builtin:service.requestCount.server:rate`,
    latencyMs: `builtin:service.response.time:avg`,
    errorRate: `builtin:service.errors.server.rate:avg`,
    activeConnections: `builtin:service.connections.active:avg`,
  },
  process: {
    cpu: `builtin:process.cpu.usage:avg`,
    memory: `builtin:process.memory.usage:avg`,
  },
  jvm: {
    heapUsed: `builtin:jvm.memory.heap.used:avg`,
    nonHeapUsed: `builtin:jvm.memory.nonheap.used:avg`,
    threadCount: `builtin:jvm.threads.count:avg`,
    gcPause: `builtin:jvm.gc.pause.time:avg`,
  },
};

/**
 * Product filters config (tamamen esnek: doluysa kullan, boşsa geç)
 * İstersen performance-config.json üzerinden override edeceğiz.
 */
const DEFAULT_PRODUCT_FILTERS = {
  httpd: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "HOST"],
    tag: { key: "product", value: "httpd" },
    managementZoneName: "MZ_HTTPD",
    namePatterns: ["httpd", "apache"],
  },
  nginx: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "HOST"],
    tag: { key: "product", value: "nginx" },
    managementZoneName: "MZ_NGINX",
    namePatterns: ["nginx"],
  },
  jboss: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "PROCESS_GROUP_INSTANCE", "HOST"],
    tag: { key: "product", value: "jboss" },
    managementZoneName: "MZ_JBOSS",
    namePatterns: ["jboss", "eap", "wildfly"],
  },
  websphere: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "PROCESS_GROUP_INSTANCE", "HOST"],
    tag: { key: "product", value: "websphere" },
    managementZoneName: "MZ_WEBSPHERE",
    namePatterns: ["websphere", "was"],
  },
  ctg: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "HOST"],
    tag: { key: "product", value: "ctg" },
    managementZoneName: "MZ_CTG",
    namePatterns: ["ctg", "cics"],
  },
  hazelcast: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "HOST"],
    tag: { key: "product", value: "hazelcast" },
    managementZoneName: "MZ_HAZELCAST",
    namePatterns: ["hazelcast"],
  },
  provenir: {
    entityTypes: ["SERVICE", "PROCESS_GROUP", "HOST"],
    tag: { key: "product", value: "provenir" },
    managementZoneName: "MZ_PROVENIR",
    namePatterns: ["provenir"],
  },
};

function mergeFilters(defaults, override) {
  const o = override && typeof override === "object" ? override : {};
  const out = { ...defaults };

  for (const [k, v] of Object.entries(o)) {
    out[k] = { ...(defaults[k] || {}), ...(v || {}) };
    // nested tag merge
    out[k].tag = { ...(defaults[k]?.tag || {}), ...(v?.tag || {}) };
    // ensure arrays
    out[k].entityTypes = toArr(out[k].entityTypes);
    out[k].namePatterns = toArr(out[k].namePatterns);
  }

  return out;
}

function pickBestEntitySelector({ entityTypes, tag, mzId, namePatterns }) {
  // Öncelik: tag > mz > namePatterns
  const tagKey = tag?.key;
  const tagValue = tag?.value;

  // entity type sırası: SERVICE -> PROCESS_GROUP -> HOST (kpi türüne göre)
  const order = toArr(entityTypes).length ? toArr(entityTypes) : ["SERVICE", "PROCESS_GROUP", "HOST"];

  // tag varsa
  if (isNonEmpty(tagKey) && isNonEmpty(tagValue)) {
    return order.map((t) => entitySelectorOf({ entityType: t, tagKey, tagValue }));
  }

  // mz varsa
  if (isNonEmpty(mzId)) {
    return order.map((t) => entitySelectorOf({ entityType: t, managementZoneId: mzId }));
  }

  // name pattern varsa
  const pats = toArr(namePatterns).filter(Boolean);
  if (pats.length) {
    return order.map((t) => entitySelectorOf({ entityType: t, namePatterns: pats }));
  }

  return [];
}

async function buildKpis({ baseUrl, token, product, selectors }) {
  // selectors: [serviceSelector, processGroupSelector, hostSelector ...]
  // KPI kaynağı: web ürünlerinde service ağırlıklı, app ürünlerinde process/jvm.
  const nowTo = "now";
  const nowFrom = "now-15m";
  const resolution = "1m";

  const kpis = {};

  // yardımcı: seçilen ilk selector ile metric query
  const q = async (metricSelector, fallbackSelectors = []) => {
    for (const sel of fallbackSelectors) {
      try {
        const resp = await queryMetric({
          baseUrl,
          token,
          metricSelector,
          entitySelector: sel,
          from: nowFrom,
          to: nowTo,
          resolution,
        });
        const n = extractSingleNumber(resp);
        if (n !== null) return n;
      } catch {
        // next selector
      }
    }
    return null;
  };

  const serviceSelectors = selectors.filter((s) => s.includes('type("SERVICE")'));
  const processSelectors = selectors.filter((s) => s.includes('type("PROCESS_GROUP")') || s.includes('type("PROCESS_GROUP_INSTANCE")'));
  const hostSelectors = selectors.filter((s) => s.includes('type("HOST")'));

  // Ortak KPI: CPU/Mem/Disk (önce host, yoksa process)
  const cpuHost = await q(METRICS.common.cpu_host, hostSelectors);
  const memHost = await q(METRICS.common.mem_host, hostSelectors);
  const diskHost = await q(METRICS.common.disk_host, hostSelectors);

  const cpuProc = await q(METRICS.process.cpu, processSelectors);
  const memProc = await q(METRICS.process.memory, processSelectors);

  kpis.cpu = cpuHost ?? cpuProc;
  kpis.memory = memHost ?? memProc;
  kpis.disk = diskHost;

  // Service KPI (rps/latency/errorRate/activeConnections)
  const rps = await q(METRICS.service.rps, serviceSelectors);
  const latencyMs = await q(METRICS.service.latencyMs, serviceSelectors);
  const errorRate = await q(METRICS.service.errorRate, serviceSelectors);
  const activeConnections = await q(METRICS.service.activeConnections, serviceSelectors);

  if (rps !== null) kpis.rps = rps;
  if (latencyMs !== null) kpis.latencyMs = latencyMs;
  if (errorRate !== null) kpis.errorRate = errorRate;
  if (activeConnections !== null) kpis.activeConnections = activeConnections;

  // JVM KPI (JBoss/WebSphere ağırlıklı) - yoksa null geç
  if (product === "jboss" || product === "websphere") {
    const heapUsed = await q(METRICS.jvm.heapUsed, processSelectors);
    const nonHeapUsed = await q(METRICS.jvm.nonHeapUsed, processSelectors);
    const threadCount = await q(METRICS.jvm.threadCount, processSelectors);
    const gcPause = await q(METRICS.jvm.gcPause, processSelectors);

    if (heapUsed !== null) kpis.heapUsed = heapUsed;
    if (nonHeapUsed !== null) kpis.nonHeapUsed = nonHeapUsed;
    if (threadCount !== null) kpis.threadCount = threadCount;
    if (gcPause !== null) kpis.gcPause = gcPause;
  }

  return kpis;
}

/**
 * Top Endpoints (degrade friendly)
 * Not: Dynatrace’te endpoint breakdown tenant’a göre değişebilir (service method dims vs.)
 * Bu yüzden "try + fallback empty".
 */
async function buildTopEndpoints({ baseUrl, token, serviceSelector, product }) {
  if (!isNonEmpty(serviceSelector)) return [];

  // Çok sık kullanılan pattern: requestCount split by request name / service method
  // Tenant uyumsuzluğunda boş dönecek, hata vermeyecek.
  const candidates = [
    // service method bazlı
    `builtin:service.requestCount.server:splitBy("dt.entity.service_method"):sort(value(rate,descending)):limit(5)`,
    // request name bazlı (bazı yerlerde farklı)
    `builtin:service.requestCount.server:splitBy("service.request.name"):sort(value(rate,descending)):limit(5)`,
  ];

  for (const metricSelector of candidates) {
    try {
      const resp = await queryMetric({
        baseUrl,
        token,
        metricSelector,
        entitySelector: serviceSelector,
        from: "now-15m",
        to: "now",
        resolution: "1m",
      });

      const r0 = resp?.result?.[0];
      const data = toArr(r0?.data);
      if (!data.length) continue;

      // dimensions[0] endpoint adı gibi kabul edelim
      const rows = data
        .map((d) => {
          const dim = toArr(d?.dimensions)?.[0] || null;
          const values = toArr(d?.values).map(safeNum).filter((x) => Number.isFinite(x));
          if (!dim || !values.length) return null;

          // values time-series; toplamı count gibi düşünelim (mock ile uyum)
          const sum = values.reduce((a, b) => a + b, 0);
          return {
            name: String(dim),
            count: Math.round(sum),
            avgMs: null,
            p95Ms: null,
            errors: null,
          };
        })
        .filter(Boolean);

      if (rows.length) return rows;
    } catch {
      // try next
    }
  }

  // fallback
  return [];
}

/**
 * Error logs (opsiyonel)
 * Dynatrace Logs API tenant’a göre değişiyor; şimdilik boş dönüyoruz.
 * (İstersen Events API ile doldururuz.)
 */
async function buildErrorLog() {
  return [];
}

/**
 * fetchAll({config, products}) => { [product]: payload }
 */
async function fetchAll({ config, products }) {
  const baseUrl = normStr(config?.dynatrace?.baseUrl);
  const token = normStr(config?.dynatrace?.apiToken);

  if (!baseUrl || !token) {
    // token/url yoksa fail etme -> boş data dön (UI çalışsın)
    const empty = {};
    for (const p of products || []) {
      empty[p] = {
        product: p,
        kpis: {},
        topEndpoints: [],
        errorLog: [],
        _note: "Dynatrace baseUrl/apiToken boş. Bu product pas geçildi.",
      };
    }
    return empty;
  }

  const overrideFilters = config?.dynatrace?.products || {};
  const filters = mergeFilters(DEFAULT_PRODUCT_FILTERS, overrideFilters);

  // management zone name -> id cache
  const mzIdCache = {};

  const out = {};

  for (const product of products || []) {
    const f = filters[product] || {};
    const tagKey = f?.tag?.key;
    const tagValue = f?.tag?.value;
    const mzName = normStr(f?.managementZoneName);
    const namePatterns = toArr(f?.namePatterns);
    const entityTypes = toArr(f?.entityTypes);

    // mz id resolve (optional)
    let mzId = null;
    if (mzName) {
      if (!mzIdCache[mzName]) {
        mzIdCache[mzName] = await resolveManagementZoneId({ baseUrl, token, mzName });
      }
      mzId = mzIdCache[mzName];
    }

    const selectors = pickBestEntitySelector({
      entityTypes,
      tag: { key: tagKey, value: tagValue },
      mzId,
      namePatterns,
    });

    // hiç filtre yoksa -> skip (degrade)
    if (!selectors.length) {
      out[product] = {
        product,
        kpis: {},
        topEndpoints: [],
        errorLog: [],
        _note: "Dynatrace filters boş (tag/mz/namePattern yok). Product skip edildi.",
      };
      continue;
    }

    // KPI’ler
    const kpis = await buildKpis({ baseUrl, token, product, selectors });

    // Top Endpoints için service selector varsa kullan
    const serviceSelector = selectors.find((s) => s.includes('type("SERVICE")')) || null;
    const topEndpoints = await buildTopEndpoints({
      baseUrl,
      token,
      serviceSelector,
      product,
    });

    const errorLog = await buildErrorLog();

    out[product] = {
      product,
      kpis: kpis || {},
      topEndpoints: topEndpoints || [],
      errorLog: errorLog || [],
      _meta: {
        selectorsUsed: selectors,
        mzId: mzId || null,
      },
    };
  }

  return out;
}

module.exports = { fetchAll };