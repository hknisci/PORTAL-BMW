// server/performance/providers/splunk.cjs
// Splunk Provider (Search API) - degrade friendly
// fetchAll({ config, products }) => { [product]: {product,kpis,topEndpoints,errorLog,_meta} }
//
// Desteklediği auth:
// 1) config.splunk.token  -> Authorization: Bearer <token>  (bazı Splunk’larda)
// 2) config.splunk.token  -> Authorization: Splunk <token>  (Splunk HEC yaygın)
// Search API için çoğunlukla "Splunk <token>" kullanılır, biz ikisini de deneriz.
//
// Endpoint varsayımı:
// baseUrl: https://splunk.company.com:8089
// POST /services/search/jobs/export  (stream JSON results)  -> pratik
//
// Not: /export çıktısı satır satır JSON olabilir. Bu yüzden parser "line-delimited JSON" destekler.

const DEFAULT_TIMEOUT_MS = 15_000;

function normStr(x) {
  return String(x ?? "").trim();
}
function isNonEmpty(x) {
  return normStr(x).length > 0;
}
function toArr(x) {
  return Array.isArray(x) ? x : [];
}

async function fetchText(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
    });

    const text = await r.text().catch(() => "");
    if (!r.ok) {
      const e = new Error(text || `HTTP ${r.status}`);
      e.status = r.status;
      e.url = url;
      throw e;
    }
    return text;
  } finally {
    clearTimeout(t);
  }
}

function joinUrl(baseUrl, p) {
  const b = baseUrl.replace(/\/+$/, "");
  const path = p.startsWith("/") ? p : `/${p}`;
  return `${b}${path}`;
}

function buildAuthHeaders(token) {
  const t = normStr(token);
  if (!t) return {};
  // önce Splunk token deneriz; bazı ortamlarda Bearer gerekir.
  return {
    Authorization: `Splunk ${t}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

function buildAuthHeadersBearer(token) {
  const t = normStr(token);
  if (!t) return {};
  return {
    Authorization: `Bearer ${t}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

/**
 * Splunk /export response parser:
 * - her satır JSON olabilir
 * - result alanı içeren satırları topla
 */
function parseExportResults(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      // export formatlarında {result:{...}} veya direkt { ...fields }
      if (obj?.result && typeof obj.result === "object") results.push(obj.result);
      else if (typeof obj === "object") results.push(obj);
    } catch {
      // ignore non-json lines
    }
  }

  return results;
}

async function splunkExportSearch({ baseUrl, token, search, earliest = "-15m", latest = "now", timeoutMs }) {
  const url = joinUrl(baseUrl, "/services/search/jobs/export");

  const body = new URLSearchParams();
  body.set("search", search.startsWith("search ") ? search : `search ${search}`);
  body.set("output_mode", "json");
  body.set("earliest_time", earliest);
  body.set("latest_time", latest);

  // önce Splunk token header dene; olmazsa Bearer dene
  try {
    const text = await fetchText(url, {
      method: "POST",
      headers: buildAuthHeaders(token),
      body,
      timeoutMs,
    });
    return parseExportResults(text);
  } catch (e1) {
    const text = await fetchText(url, {
      method: "POST",
      headers: buildAuthHeadersBearer(token),
      body,
      timeoutMs,
    });
    return parseExportResults(text);
  }
}

/**
 * SPL filter builder (doluysa kullan, boşsa geç)
 */
function buildBaseFilter({ index, sourcetypes, tags, hostPatterns }) {
  const parts = [];

  if (isNonEmpty(index)) parts.push(`index="${index}"`);

  const sts = toArr(sourcetypes).map(normStr).filter(Boolean);
  if (sts.length === 1) parts.push(`sourcetype="${sts[0]}"`);
  if (sts.length > 1) parts.push(`( ${sts.map((x) => `sourcetype="${x}"`).join(" OR ")} )`);

  // Tag mantığı: label field’ı üzerinden (örnek: product=httpd)
  // Splunk’ta field name değişebilir: product, app, application, component, service, tag vs.
  // Biz "tagField" gibi bir parametre de destekleyeceğiz.
  const tagArr = toArr(tags).map((x) => x && typeof x === "object" ? x : null).filter(Boolean);
  for (const t of tagArr) {
    const field = normStr(t.field || "product");
    const value = normStr(t.value);
    if (field && value) parts.push(`${field}="${value}"`);
  }

  const hp = toArr(hostPatterns).map(normStr).filter(Boolean);
  if (hp.length === 1) parts.push(`host="*${hp[0]}*"`);
  if (hp.length > 1) parts.push(`( ${hp.map((p) => `host="*${p}*"`).join(" OR ")} )`);

  return parts.length ? parts.join(" ") : "";
}

/**
 * Default product filters (config ile override edilebilir)
 */
const DEFAULT_PRODUCT_FILTERS = {
  httpd: {
    index: "main",
    sourcetypes: ["access_combined", "apache:access", "httpd:access", "apache"],
    tags: [{ field: "product", value: "httpd" }],
    hostPatterns: ["httpd", "apache"],
  },
  nginx: {
    index: "main",
    sourcetypes: ["nginx:access", "nginx", "nginx:ingress", "access_combined"],
    tags: [{ field: "product", value: "nginx" }],
    hostPatterns: ["nginx"],
  },
  jboss: {
    index: "main",
    sourcetypes: ["jboss:server", "wildfly:server", "eap:server", "jboss"],
    tags: [{ field: "product", value: "jboss" }],
    hostPatterns: ["jboss", "eap", "wildfly"],
  },
  websphere: {
    index: "main",
    sourcetypes: ["was:systemout", "websphere:systemout", "websphere"],
    tags: [{ field: "product", value: "websphere" }],
    hostPatterns: ["websphere", "was"],
  },
  ctg: {
    index: "main",
    sourcetypes: ["ctg:log", "cics:tg", "ctg"],
    tags: [{ field: "product", value: "ctg" }],
    hostPatterns: ["ctg", "cics"],
  },
  hazelcast: {
    index: "main",
    sourcetypes: ["hazelcast:log", "hazelcast"],
    tags: [{ field: "product", value: "hazelcast" }],
    hostPatterns: ["hazelcast"],
  },
  provenir: {
    index: "main",
    sourcetypes: ["provenir:log", "provenir"],
    tags: [{ field: "product", value: "provenir" }],
    hostPatterns: ["provenir"],
  },
};

function mergeFilters(defaults, override) {
  const o = override && typeof override === "object" ? override : {};
  const out = { ...defaults };
  for (const [k, v] of Object.entries(o)) {
    out[k] = { ...(defaults[k] || {}), ...(v || {}) };
    out[k].sourcetypes = toArr(out[k].sourcetypes);
    out[k].tags = toArr(out[k].tags);
    out[k].hostPatterns = toArr(out[k].hostPatterns);
  }
  return out;
}

/**
 * KPI query templates
 * - KPI alanları Splunk field’larına bağlıdır.
 * - coalesce ile yaygın alternatifleri dener.
 */
function splKpiQuery({ baseFilter, product }) {
  // CPU/MEM/DISK: infra metrics index ayrı olabilir -> config ile ayrı index verilirse override ederiz.
  // Şimdilik loglardan KPI üretme yaklaşımı:
  // - rps: count/time
  // - latency: avg(response_time|request_time|latency|duration) *1000 ms
  // - errorRate: status>=500 oranı
  // - activeConnections: conn/active_conn gibi alanlar varsa avg
  //
  // Eğer field yoksa null kalacak.
  return `
    ${baseFilter}
    | eval rt=coalesce(response_time,request_time,latency,duration,elapsed,rt)
    | eval rt_ms=case(isnum(rt), rt*1000, match(rt,"^[0-9.]+$"), tonumber(rt)*1000, true(), null())
    | eval status_num=tonumber(coalesce(status,http_status,sc,status_code))
    | eval is_err=if(status_num>=500,1,0)
    | stats
        count as _count,
        avg(rt_ms) as latencyMs,
        (sum(is_err)/count)*100 as errorRate,
        avg(tonumber(coalesce(active_connections,activeConn,connections,conn,nginx_connections_active))) as activeConnections,
        avg(tonumber(coalesce(cpu,cpu_pct,cpuPercent,process_cpu,host_cpu))) as cpu,
        avg(tonumber(coalesce(mem,mem_pct,memPercent,memory,process_mem,host_mem))) as memory,
        avg(tonumber(coalesce(disk,disk_pct,diskPercent,host_disk))) as disk,
        avg(tonumber(coalesce(threadCount,threads,thread_count,jvm_threads))) as threadCount
    | eval rps=round(_count/900,2)
    | fields cpu,memory,disk,rps,latencyMs,errorRate,activeConnections,threadCount
  `;
}

function splTopEndpointsQuery({ baseFilter, product }) {
  // endpoint alanları çok değişir: uri_path, uri, path, request, url, endpoint
  return `
    ${baseFilter}
    | eval endpoint=coalesce(uri_path,uri,path,request,request_path,url,endpoint,cs_uri_stem)
    | where isnotnull(endpoint) AND endpoint!=""
    | eval rt=coalesce(response_time,request_time,latency,duration,elapsed,rt)
    | eval rt_ms=case(isnum(rt), rt*1000, match(rt,"^[0-9.]+$"), tonumber(rt)*1000, true(), null())
    | eval status_num=tonumber(coalesce(status,http_status,sc,status_code))
    | eval is_err=if(status_num>=500,1,0)
    | stats
        count as count,
        avg(rt_ms) as avgMs,
        perc95(rt_ms) as p95Ms,
        sum(is_err) as errors
      by endpoint
    | sort - count
    | head 5
    | rename endpoint as name
    | fields name,count,avgMs,p95Ms,errors
  `;
}

function splErrorLogQuery({ baseFilter, product }) {
  // message alanı: _raw, message, msg, log
  // level alanı: level, severity, log_level
  return `
    ${baseFilter}
    | eval level=upper(coalesce(level,severity,log_level,loglevel))
    | eval message=coalesce(message,msg,log,_raw)
    | where like(level,"%ERROR%") OR like(level,"%WARN%") OR match(message,"(?i)error|exception|fail|timeout")
    | eval ts=strftime(_time,"%Y-%m-%dT%H:%M:%S")
    | table ts level message
    | head 6
  `;
}

function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapKpiRow(row) {
  if (!row || typeof row !== "object") return {};
  const out = {};
  const fields = ["cpu", "memory", "disk", "rps", "latencyMs", "errorRate", "activeConnections", "threadCount"];
  for (const f of fields) {
    const v = row[f];
    const n = toNumberOrNull(v);
    out[f] = n !== null ? n : (v === null || v === undefined ? null : v);
  }
  // null olanları tutabiliriz; UI fmt "-" basacak
  return out;
}

function mapTopEndpointRows(rows) {
  return toArr(rows).map((r) => ({
    name: String(r?.name ?? r?.endpoint ?? "-"),
    count: toNumberOrNull(r?.count) ?? 0,
    avgMs: toNumberOrNull(r?.avgMs),
    p95Ms: toNumberOrNull(r?.p95Ms),
    errors: toNumberOrNull(r?.errors),
  }));
}

function mapErrorLogRows(rows) {
  return toArr(rows).map((r) => ({
    ts: String(r?.ts ?? ""),
    level: String(r?.level ?? ""),
    message: String(r?.message ?? r?._raw ?? ""),
  }));
}

async function fetchProduct({ baseUrl, token, product, filter, earliest, latest }) {
  const baseFilter = buildBaseFilter(filter);
  if (!baseFilter) {
    return {
      product,
      kpis: {},
      topEndpoints: [],
      errorLog: [],
      _note: "Splunk filter boş (index/sourcetype/tag/hostPattern yok). Product skip edildi.",
    };
  }

  // KPI
  let kpis = {};
  try {
    const kpiRows = await splunkExportSearch({
      baseUrl,
      token,
      search: splKpiQuery({ baseFilter, product }),
      earliest,
      latest,
    });
    if (kpiRows && kpiRows.length) kpis = mapKpiRow(kpiRows[0]);
  } catch {
    // degrade: boş
    kpis = {};
  }

  // Top endpoints
  let topEndpoints = [];
  try {
    const rows = await splunkExportSearch({
      baseUrl,
      token,
      search: splTopEndpointsQuery({ baseFilter, product }),
      earliest,
      latest,
    });
    topEndpoints = mapTopEndpointRows(rows);
  } catch {
    topEndpoints = [];
  }

  // Error logs
  let errorLog = [];
  try {
    const rows = await splunkExportSearch({
      baseUrl,
      token,
      search: splErrorLogQuery({ baseFilter, product }),
      earliest,
      latest,
    });
    errorLog = mapErrorLogRows(rows);
  } catch {
    errorLog = [];
  }

  return {
    product,
    kpis,
    topEndpoints,
    errorLog,
    _meta: {
      baseFilter,
      timeRange: { earliest, latest },
    },
  };
}

/**
 * MAIN
 */
async function fetchAll({ config, products }) {
  const baseUrl = normStr(config?.splunk?.baseUrl);
  const token = normStr(config?.splunk?.token);

  // token/url yoksa fail etme -> boş data dön
  if (!baseUrl || !token) {
    const empty = {};
    for (const p of products || []) {
      empty[p] = {
        product: p,
        kpis: {},
        topEndpoints: [],
        errorLog: [],
        _note: "Splunk baseUrl/token boş. Bu product pas geçildi.",
      };
    }
    return empty;
  }

  const earliest = normStr(config?.splunk?.earliest) || "-15m";
  const latest = normStr(config?.splunk?.latest) || "now";

  const overrideFilters = config?.splunk?.products || {};
  const filters = mergeFilters(DEFAULT_PRODUCT_FILTERS, overrideFilters);

  const out = {};
  for (const p of products || []) {
    const f = filters[p] || {};
    out[p] = await fetchProduct({
      baseUrl,
      token,
      product: p,
      filter: f,
      earliest,
      latest,
    });
  }

  return out;
}

module.exports = { fetchAll };