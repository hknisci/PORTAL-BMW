// server/performance/scheduler.cjs
const { readConfig, readCache, writeCache } = require("./cache.cjs");
const mock = require("./providers/mock.cjs");
const dynatrace = require("./providers/dynatrace.cjs");
const splunk = require("./providers/splunk.cjs");

let timer = null;
let running = false;

function pickProvider(name) {
  const n = String(name || "").toLowerCase();
  if (n === "dynatrace") return dynatrace;
  if (n === "splunk") return splunk;
  return mock;
}

async function runOnce() {
  if (running) return { ok: false, skipped: true, reason: "already-running" };
  running = true;

  const cfg = readConfig();
  const providerName = cfg.provider || "mock";
  const provider = pickProvider(providerName);

  try {
    const products = Array.isArray(cfg.products) ? cfg.products : [];
    const data = await provider.fetchAll({ config: cfg, products });

    const next = {
      updatedAt: new Date().toISOString(),
      provider: providerName,
      data,
      lastError: null,
    };
    writeCache(next);
    return { ok: true, updatedAt: next.updatedAt, provider: providerName };
  } catch (e) {
    const prev = readCache();
    const next = {
      ...prev,
      lastError: String(e?.message || e),
    };
    writeCache(next);
    return { ok: false, error: next.lastError };
  } finally {
    running = false;
  }
}

function start() {
  const cfg = readConfig();
  if (!cfg.enabled) return { ok: true, started: false, reason: "disabled" };

  const intervalSeconds = Number(cfg.intervalSeconds || 60);
  const ms = Math.max(5, intervalSeconds) * 1000;

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    runOnce().catch(() => {});
  }, ms);

  // ilk kalkışta bir kez de hemen çekelim
  runOnce().catch(() => {});

  return { ok: true, started: true, intervalSeconds: Math.max(5, intervalSeconds) };
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  return { ok: true, stopped: true };
}

function status() {
  const cfg = readConfig();
  return {
    ok: true,
    enabled: !!cfg.enabled,
    provider: cfg.provider || "mock",
    intervalSeconds: Number(cfg.intervalSeconds || 60),
    running,
    timerActive: !!timer,
  };
}

module.exports = { start, stop, status, runOnce };