// server/service.cjs
const express = require("express");

function createApp() {
  const app = express();

  // common middlewares
  app.use(express.json({ limit: "2mb" }));

  // health
  app.get("/api/health", (req, res) => res.json({ ok: true, service: "api" }));

  return app;
}

module.exports = { createApp };