// server/performance/router.cjs
const express = require("express");
const { readCache, readConfig, writeConfig } = require("./cache.cjs");
const scheduler = require("./scheduler.cjs");

function createPerformanceRouter() {
  const router = express.Router();
  router.use(express.json({ limit: "2mb" }));

  // GET /api/performance/health
  router.get("/health", (req, res) => {
    res.json({ ok: true, service: "performance", scheduler: scheduler.status() });
  });

  // GET /api/performance/cache
  router.get("/cache", (req, res) => {
    res.json({ ok: true, cache: readCache() });
  });

  // ✅ GET /api/performance/snapshot?product=httpd
  router.get("/snapshot", (req, res) => {
    const product = String(req.query.product || "").toLowerCase().trim();
    const cache = readCache();

    const dataAll = cache?.data || {};
    const dataOne = product ? (dataAll[product] ?? null) : dataAll;

    res.json({
      ok: true,
      product: product || "all",
      provider: cache.provider || "mock",
      updatedAt: cache.updatedAt || null,
      data: dataOne,
      lastError: cache.lastError || null,
    });
  });

  // GET /api/performance/config
  router.get("/config", (req, res) => {
    res.json({ ok: true, config: readConfig() });
  });

  // POST /api/performance/config
  router.post("/config", (req, res) => {
    const current = readConfig();
    const incoming = req.body || {};
    const next = { ...current, ...incoming };
    writeConfig(next);

    // config değişince scheduler restart
    scheduler.start();

    res.json({ ok: true, config: next });
  });

  // POST /api/performance/refresh  (manual refresh)
  router.post("/refresh", async (req, res) => {
    const r = await scheduler.runOnce();
    const cache = readCache();
    res.json({ ok: r.ok, refresh: r, cache });
  });

  // POST /api/performance/refresh-all
  router.post("/refresh-all", async (req, res) => {
    const r = await scheduler.runOnce();
    res.json(r);
  });

  return router;
}

// hem factory hem hazır router export
const performanceRouter = createPerformanceRouter();

module.exports = {
  createPerformanceRouter,
  performanceRouter,
};