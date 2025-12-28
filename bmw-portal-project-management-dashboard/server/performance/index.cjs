// server/performance/index.cjs
const { performanceRouter } = require("./router.cjs");
const scheduler = require("./scheduler.cjs");

function initPerformance(app) {
  // router mount (server/index.cjs bunu çağırır)
  app.use("/api/performance", performanceRouter);

  // server ayağa kalkınca scheduler başlasın
  scheduler.start();

  console.log("[Performance] module initialized (router mounted at /api/performance)");
}

module.exports = {
  initPerformance,
  performanceRouter,
  performanceScheduler: scheduler,
};