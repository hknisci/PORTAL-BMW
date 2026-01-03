// server/performance/router.cjs
const express = require("express");
const { readCache, readConfig, writeConfig } = require("./cache.cjs");
const scheduler = require("./scheduler.cjs");

function createPerformanceRouter() {
  const router = express.Router();
  router.use(express.json({ limit: "2mb" }));

  // ✅ GET /api/performance  (root)
  router.get("/", (req, res) => {
    res.json({
      ok: true,
      service: "performance",
      endpoints: {
        health: "/api/performance/health",
        cache: "/api/performance/cache",
        snapshot: "/api/performance/snapshot?product=<name>",
        configGet: "/api/performance/config",
        configPost: "/api/performance/config",
        refresh: "/api/performance/refresh",
        refreshAll: "/api/performance/refresh-all",
      },
    });
  });

  // GET /api/performance/health
  router.get("/health", (req, res) => {
    res.json({ ok: true, service: "performance", scheduler: scheduler.status() });
  });

  // GET /api/performance/cache
  router.get("/cache", (req, res) => {
    res.json({ ok: true, cache: readCache() });
  });

  // GET /api/performance/snapshot?product=httpd
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

    scheduler.start(); // config değişince scheduler restart

    res.json({ ok: true, config: next });
  });

  // POST /api/performance/refresh
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

const performanceRouter = createPerformanceRouter();

module.exports = {
  createPerformanceRouter,
  performanceRouter,
};