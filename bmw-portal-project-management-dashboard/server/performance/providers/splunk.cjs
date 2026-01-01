// server/performance/providers/splunk.cjs
//
// GOAL: "Strong dev structure, production-ready with only config changes."
// - No hard dependency on a single standard.
// - Multi-step fallback discovery per product.
// - Rich scope/debug output to tune in production.
//
// IMPORTANT POLICY:
// - Logs: we DO take logs from Splunk (errorLog).
// - Dynatrace won't be used for logs.
// - If some fields are missing => "not used" not "error".
// - On failures, keep payload but fill scope.*Error with actionable reason.

const DEFAULT_TIMEOUT_MS = 20_000;

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function esc(s) { return String(s).replace(/"/g, '\\"'); }
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeBaseUrl(baseUrl) {
  const b = String(baseUrl || "").trim();
  return b ? b.replace(/\/+$/, "") : "";
}
function pickTimeWindow(cfg) {
  const mins = Number(cfg?.splunk?.windowMinutes || 15);
  const m = Number.isFinite(mins) ? Math.max(5, mins) : 15;
  return { earliest: `-${m}m`, latest: "now" };
}

// ========== TIMESERIES HELPERS ==========
function toIsoTime(t) {
  // Splunk _time bazen epoch (seconds) string/number, bazen ISO olabilir.
  const n = Number(t);
  if (Number.isFinite(n) && n > 0) return new Date(n * 1000).toISOString();
  const d = new Date(String(t));
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function rowsToPoints(rows, valueKey) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows) {
    const ts = toIsoTime(r?._time);
    const v = toNum(r?.[valueKey]);
    if (ts && v !== null) out.push({ t: ts, v });
  }
  return out;
}

// ========== AUTH HEADER (flex) ==========
// In production you may need: "Splunk <token>" instead of "Bearer <token>".
// We'll support BOTH via config.splunk.authScheme.
function splunkHeaders(cfg) {
  const token = String(cfg?.splunk?.token || "").trim();
  const scheme = String(cfg?.splunk?.authScheme || "Bearer").trim(); // "Bearer" | "Splunk"
  return {
    Authorization: `${scheme} ${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

function explainFetchError(e, context) {
  const msg = String(e?.message || e || "unknown error");
  const cause = e?.cause ? `${e.cause.code || ""} ${e.cause.message || ""}`.trim() : "";
  const hint = [];

  if (cause.includes("ENOTFOUND") || cause.includes("EAI_AGAIN")) hint.push("DNS/host resolve sorunu (Splunk host erişilemiyor).");
  if (cause.includes("ECONNREFUSED")) hint.push("Port kapalı/yanlış port (mgmt API genelde 8089).");
  if (cause.toLowerCase().includes("certificate") || cause.includes("CERT") || cause.includes("SELF_SIGNED")) {
    hint.push("TLS/CA sorunu: NODE_EXTRA_CA_CERTS ile corporate CA ekle.");
  }
  if (cause.includes("ETIMEDOUT") || msg.toLowerCase().includes("aborted")) hint.push("Timeout: network/firewall/proxy.");

  return [
    `[Splunk] fetch failed`,
    context ? `context=${context}` : null,
    `message=${msg}`,
    cause ? `cause=${cause}` : null,
    hint.length ? `hint=${hint.join(" | ")}` : null,
  ].filter(Boolean).join(" :: ");
}

/**
 * Splunk streaming export endpoint (preferred for simple jobs)
 * POST /services/search/jobs/export?output_mode=json
 *
 * NOTE:
 * - This endpoint is on Splunk management API (typically :8089)
 * - If you accidentally set baseUrl to UI port :8000 => will not work.
 *
 * PROD CHECKLIST:
 * 1) baseUrl is mgmt (8089): https://HOST:8089
 * 2) token has "search" permission
 * 3) TLS is trusted (corporate CA / NODE_EXTRA_CA_CERTS)
 */
async function splunkSearchExport({ cfg, baseUrl, search, earliest, latest, timeoutMs }) {
  const url = `${baseUrl}/services/search/jobs/export?output_mode=json`;

  const body = new URLSearchParams();
  body.set("search", search.startsWith("search ") ? search : `search ${search}`);
  body.set("earliest_time", earliest);
  body.set("latest_time", latest);
  body.set("preview", "false");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: splunkHeaders(cfg),
      body: body.toString(),
      signal: controller.signal,
    });

    const text = await res.text();

    if (!res.ok) {
      const snippet = text ? text.slice(0, 700) : "";
      throw new Error(`[Splunk] HTTP ${res.status} ${res.statusText} :: ${snippet}`);
    }

    // export json: line by line objects; pick only result lines
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const results = [];
    for (const line of lines) {
      const obj = safeJsonParse(line, null);
      if (obj && obj.result) results.push(obj.result);
    }
    return results;
  } catch (e) {
    throw new Error(explainFetchError(e, `export url=${url}`));
  } finally {
    clearTimeout(t);
  }
}

// ========== DISCOVERY / SCOPE ==========
// We don't know the standard. We'll do progressive widening searches.
// Each stage is a baseSearch candidate.
// In production, you look at scope.discoveryStages[] and decide what to change.

// Global default field candidates (high probability in many orgs)
function defaultFieldCandidates() {
  return [
    // generic
    "product", "app", "application", "service", "component", "subsystem", "domain",
    "team", "owner", "managed_by", "management_zone", "mz", "env", "environment",
    // k8s common
    "k8s.app", "k8s.app.name", "k8s.container.name", "k8s.namespace.name",
    "kubernetes.container_name", "kubernetes.pod_name", "kubernetes.namespace",
    "namespace", "pod", "container", "container_name",
    // infra/process-ish
    "process_group", "processGroup", "process.name", "process", "pg",
    "host", "host.name", "hostname",
    // tags labels
    "tag", "tags", "label", "labels",
  ];
}

function listFrom(x) {
  return Array.isArray(x) ? x.map((v) => String(v || "").trim()).filter(Boolean) : [];
}

function buildIndexClause(cfg, prodCfg) {
  const idx = listFrom(prodCfg?.indexes).length ? listFrom(prodCfg.indexes) : listFrom(cfg?.splunk?.indexes);
  if (!idx.length) return "";
  return `(${idx.map((i) => `index=${esc(i)}`).join(" OR ")})`;
}

function buildOptionalClause(fieldName, values) {
  const list = listFrom(values);
  if (!list.length) return "";
  return `(${list.map((v) => `${fieldName}="${esc(v)}"`).join(" OR ")})`;
}

function buildProductClause(productKey, prodCfg, cfg, mode /* "strict"|"wide" */) {
  // product match value: if provided, use it. else productKey
  const matchValue = String(prodCfg?.matchValue || prodCfg?.tagValue || productKey || "").trim();
  const keywords = listFrom(prodCfg?.keywords);

  const globalFields = listFrom(cfg?.splunk?.fieldCandidates);
  const prodFields = listFrom(prodCfg?.fieldCandidates);

  const fields = (prodFields.length ? prodFields : (globalFields.length ? globalFields : defaultFieldCandidates()));

  const clauses = [];

  if (matchValue) {
    for (const f of fields) {
      // strict => only equals
      // wide   => equals + wildcard
      clauses.push(`${f}="${esc(matchValue)}"`);
      if (mode === "wide") clauses.push(`${f}="*${esc(matchValue)}*"`);
    }
  }

  // keywords are "raw string contains" fallback (can be expensive; use in wide only)
  if (mode === "wide") {
    for (const k of keywords) clauses.push(`"${esc(k)}"`);
  }

  if (!clauses.length) return "";
  return `(${clauses.join(" OR ")})`;
}

function buildBaseSearchStages(cfg, productKey) {
  const prodCfg = (cfg?.splunk?.products || {})[productKey] || {};

  const idxClause = buildIndexClause(cfg, prodCfg);
  const stClause = buildOptionalClause("sourcetype", prodCfg?.sourcetypes);
  const srcClause = buildOptionalClause("source", prodCfg?.sources);
  const hostClause = buildOptionalClause("host", prodCfg?.hosts);

  // Stage 1: strict + (index) + optional sourcetype/source/host + strict product match
  const strictProduct = buildProductClause(productKey, prodCfg, cfg, "strict");
  const stage1 = [idxClause, stClause, srcClause, hostClause, strictProduct].filter(Boolean).join(" ").trim();

  // Stage 2: wide + keep index + optional sourcetype/source/host + wide product/keywords
  const wideProduct = buildProductClause(productKey, prodCfg, cfg, "wide");
  const stage2 = [idxClause, stClause, srcClause, hostClause, wideProduct].filter(Boolean).join(" ").trim();

  // Stage 3: ultra-wide fallback (only index + keywords/product; remove sourcetype/source/host constraints)
  // PROD NOTE: If stage3 works but stage1 doesn't => your sourcetype/source/host filters are wrong.
  const stage3 = [idxClause, wideProduct].filter(Boolean).join(" ").trim();

  // Stage 4: emergency (no index). Only if config has no indexes at all.
  // PROD NOTE: Avoid this in large Splunk - too expensive. Keep as last resort.
  const stage4 = wideProduct;

  const stages = [
    { name: "stage1_strict", baseSearch: stage1 },
    { name: "stage2_wide", baseSearch: stage2 },
    { name: "stage3_ultra_wide_no_st_src_host", baseSearch: stage3 },
    { name: "stage4_no_index_emergency", baseSearch: stage4 },
  ].filter((s) => String(s.baseSearch || "").trim().length > 0);

  return stages;
}

// ========== QUERY TEMPLATES (field mapping) ==========
function getSplTemplates(cfg, productKey) {
  const base = cfg?.splunk?.spl || {};
  const prod = (cfg?.splunk?.products || {})[productKey] || {};
  const ov = prod.splOverride || {};

  // Common field mappings (override in prod)
  const endpointField = String(prod.endpointField || base.endpointField || "uri_path").trim();
  const statusField = String(prod.statusField || base.statusField || "status").trim();
  const latencyField = String(prod.latencyField || base.latencyField || "latencyMs").trim();
  const levelField = String(prod.levelField || base.levelField || "level").trim();

  const templates = {
    // cheap "events count" + derived rps
    kpis: `
      | stats count as events
      | eval rps=round(events/(${cfg?.splunk?.windowMinutes || 15}*60),2)
    `.trim(),

    latency: `
      | eval __lat=tonumber(${latencyField})
      | where isnotnull(__lat)
      | stats avg(__lat) as latencyAvg p95(__lat) as latencyP95
    `.trim(),

    errorRate: `
      | eval __st=tonumber(${statusField})
      | eval __lvl=coalesce(${levelField}, log_level, severity, "INFO")
      | eval __msg=coalesce(message, msg, _raw)
      | eval __isErr=if(__st>=500 OR (__lvl="ERROR" OR __lvl="Error" OR __lvl="error") OR match(__msg,"(?i)exception|error|failed|timeout"), 1, 0)
      | stats count as total sum(__isErr) as errors
      | eval errorRate=if(total>0, round((errors/total)*100,2), 0)
    `.trim(),

    topEndpoints: `
      | eval __ep=coalesce(${endpointField}, uri, path, request, url, cs_uri_stem, http_url, http.url, "unknown")
      | eval __lat=tonumber(${latencyField})
      | eval __st=tonumber(${statusField})
      | stats count as count avg(__lat) as avgMs p95(__lat) as p95Ms sum(eval(__st>=500)) as errors by __ep
      | sort - count
      | head 5
      | eval name=__ep
      | fields name,count,avgMs,p95Ms,errors
    `.trim(),

    errorLog: `
      | eval __lvl=coalesce(${levelField}, log_level, severity, "INFO")
      | eval __msg=coalesce(message, msg, _raw)
      | eval __st=tonumber(${statusField})
      | where (__st>=500) OR (__lvl="ERROR" OR __lvl="Error" OR __lvl="error") OR match(__msg,"(?i)exception|error|failed|timeout")
      | eval ts=strftime(_time,"%Y-%m-%dT%H:%M:%S%z")
      | head 6
      | fields ts,__lvl,__msg
      | rename __lvl as level, __msg as message
    `.trim(),

    // ===== TIMESERIES =====
    seriesRps: `
      | timechart span=1m count as events
      | eval rps=round(events/60,2)
      | fields _time,rps
    `.trim(),

    seriesLatency: `
      | eval __lat=tonumber(${latencyField})
      | where isnotnull(__lat)
      | timechart span=1m avg(__lat) as latencyMs
      | fields _time,latencyMs
    `.trim(),

    seriesErrorRate: `
      | eval __st=tonumber(${statusField})
      | eval __lvl=coalesce(${levelField}, log_level, severity, "INFO")
      | eval __msg=coalesce(message, msg, _raw)
      | eval __isErr=if(__st>=500 OR (__lvl="ERROR" OR __lvl="Error" OR __lvl="error") OR match(__msg,"(?i)exception|error|failed|timeout"), 1, 0)
      | timechart span=1m count as total sum(__isErr) as errors
      | eval errorRate=if(total>0, round((errors/total)*100,2), 0)
      | fields _time,errorRate
    `.trim(),
  };

  return { ...templates, ...base.templates, ...ov };
}

// A quick "probe" query: do we have any events for this baseSearch in window?
async function probeHasEvents({ cfg, baseUrl, earliest, latest, baseSearch }) {
  const search = `${baseSearch} | stats count as c`;
  const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest, timeoutMs: 12_000 });
  const c = toNum(rows?.[0]?.c);
  return (c !== null && c > 0);
}

async function resolveBaseSearch({ cfg, baseUrl, productKey, scope }) {
  const { earliest, latest } = pickTimeWindow(cfg);
  const stages = buildBaseSearchStages(cfg, productKey);
  scope.discoveryStages = stages.map((s) => ({ name: s.name, baseSearch: s.baseSearch }));

  for (const st of stages) {
    try {
      const ok = await probeHasEvents({ cfg, baseUrl, earliest, latest, baseSearch: st.baseSearch });
      scope.discoveryProbe = scope.discoveryProbe || [];
      scope.discoveryProbe.push({ stage: st.name, ok });

      if (ok) {
        scope.baseSearch = st.baseSearch;
        scope.discoverySelected = st.name;
        scope.earliest = earliest;
        scope.latest = latest;
        return st.baseSearch;
      }
    } catch (e) {
      scope.discoveryProbe = scope.discoveryProbe || [];
      scope.discoveryProbe.push({ stage: st.name, ok: false, error: String(e?.message || e) });
    }
  }

  const fallback = stages[stages.length - 1]?.baseSearch || "";
  scope.baseSearch = fallback;
  scope.discoverySelected = stages[stages.length - 1]?.name || "none";
  scope.earliest = earliest;
  scope.latest = latest;
  scope.discoveryNote =
    "No events found by probe. In PROD: adjust indexes/sourcetype/fieldCandidates/matchValue/keywords.";
  return fallback;
}

async function fetchOneProduct({ cfg, baseUrl, productKey }) {
  const scope = {
    product: productKey,
    baseSearch: "",
    earliest: "",
    latest: "",
    discoverySelected: "",
    discoveryStages: [],
    discoveryProbe: [],
  };

  const baseSearch = await resolveBaseSearch({ cfg, baseUrl, productKey, scope });
  const { earliest, latest } = pickTimeWindow(cfg);
  const templates = getSplTemplates(cfg, productKey);

  const kpis = {};
  const timeseries = {};
  let topEndpoints = [];
  let errorLog = [];

  // KPI: RPS
  try {
    const search = `${baseSearch} ${templates.kpis}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    const r0 = rows[0] || {};
    const rps = toNum(r0.rps);
    if (rps !== null) kpis.rps = rps;
  } catch (e) {
    scope.kpisError = String(e?.message || e);
  }

  // KPI: error rate
  try {
    const search = `${baseSearch} ${templates.errorRate}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    const r0 = rows[0] || {};
    const er = toNum(r0.errorRate);
    if (er !== null) kpis.errorRate = er;
  } catch (e) {
    scope.errorRateError = String(e?.message || e);
  }

  // KPI: latency avg + p95
  try {
    const search = `${baseSearch} ${templates.latency}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    const r0 = rows[0] || {};
    const avg = toNum(r0.latencyAvg);
    const p95 = toNum(r0.latencyP95);
    if (avg !== null) kpis.latencyMs = avg;
    if (p95 !== null) kpis.latencyP95Ms = p95;
  } catch (e) {
    scope.latencyError = String(e?.message || e);
  }

  // ===== TIMESERIES: RPS =====
  try {
    const search = `${baseSearch} ${templates.seriesRps}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    const pts = rowsToPoints(rows, "rps");
    if (pts.length) timeseries.rps = pts;
  } catch (e) {
    scope.seriesRpsError = String(e?.message || e);
  }

  // ===== TIMESERIES: latency (avg) =====
  try {
    const search = `${baseSearch} ${templates.seriesLatency}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    const pts = rowsToPoints(rows, "latencyMs");
    if (pts.length) timeseries.latencyMs = pts;
  } catch (e) {
    scope.seriesLatencyError = String(e?.message || e);
  }

  // ===== TIMESERIES: errorRate =====
  try {
    const search = `${baseSearch} ${templates.seriesErrorRate}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    const pts = rowsToPoints(rows, "errorRate");
    if (pts.length) timeseries.errorRate = pts;
  } catch (e) {
    scope.seriesErrorRateError = String(e?.message || e);
  }

  // Top endpoints
  try {
    const search = `${baseSearch} ${templates.topEndpoints}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    topEndpoints = rows.map((r) => ({
      name: r.name || r.__ep || "unknown",
      count: toNum(r.count) ?? 0,
      avgMs: toNum(r.avgMs),
      p95Ms: toNum(r.p95Ms),
      errors: toNum(r.errors),
    }));
  } catch (e) {
    scope.topEndpointsError = String(e?.message || e);
  }

  // Error logs
  try {
    const search = `${baseSearch} ${templates.errorLog}`;
    const rows = await splunkSearchExport({ cfg, baseUrl, search, earliest, latest });
    errorLog = rows.map((r) => ({
      ts: r.ts || r._time || "",
      level: r.level || "INFO",
      message: r.message || "",
    }));
  } catch (e) {
    scope.errorLogError = String(e?.message || e);
  }

  return {
    product: productKey,
    kpis,
    timeseries,
    topEndpoints,
    errorLog,
    scope,
  };
}

async function fetchAll({ config, products }) {
  const cfg = config || {};
  const baseUrl = normalizeBaseUrl(cfg?.splunk?.baseUrl);
  const token = String(cfg?.splunk?.token || "").trim();

  if (!baseUrl || !token) {
    const out = {};
    for (const p of products || []) {
      const stages = buildBaseSearchStages(cfg, p);
      const { earliest, latest } = pickTimeWindow(cfg);

      out[p] = {
        product: p,
        kpis: {},
        timeseries: {},
        topEndpoints: [],
        errorLog: [],
        scope: {
          product: p,
          earliest,
          latest,
          baseSearch: stages[stages.length - 1]?.baseSearch || "",
          discoverySelected: stages[stages.length - 1]?.name || "none",
          discoveryStages: stages.map((s) => ({ name: s.name, baseSearch: s.baseSearch })),
          discoveryProbe: [],
          discoveryNote:
            "Splunk config missing (baseUrl/token). PROD'da baseUrl/token girince probe+queries çalışır.",
        },
      };
    }
    return out;
  }

  const out = {};
  for (const p of products || []) {
    out[p] = await fetchOneProduct({ cfg, baseUrl, productKey: p });
  }
  return out;
}

module.exports = { fetchAll };