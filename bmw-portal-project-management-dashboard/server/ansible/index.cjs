// server/ansible/index.cjs
const express = require("express");
const {
  readStore,
  writeStore,
  normalizeTemplate,
  validateTemplate,
} = require("./store.cjs");

function initAnsible(app) {
  const router = express.Router();
  router.use(express.json({ limit: "2mb" }));

  router.get("/health", (req, res) => {
    res.json({ ok: true, service: "ansible" });
  });

  router.get("/templates", (req, res) => {
    const items = readStore();
    res.json({ ok: true, items });
  });

  router.get("/templates/:id", (req, res) => {
    const id = String(req.params.id || "");
    const items = readStore();
    const item = items.find((x) => String(x.id) === id);
    if (!item) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, item });
  });

  router.post("/templates", (req, res) => {
    const items = readStore();
    const t = normalizeTemplate(req.body || {});
    const errors = validateTemplate(t);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    writeStore([t, ...items]);
    res.json({ ok: true, item: t, items: [t, ...items] });
  });

  router.put("/templates/:id", (req, res) => {
    const id = String(req.params.id || "");
    const items = readStore();

    const idx = items.findIndex((x) => String(x.id) === id);
    if (idx < 0) return res.status(404).json({ ok: false, error: "not found" });

    const merged = normalizeTemplate({
      ...items[idx],
      ...req.body,
      id,
      createdAt: items[idx].createdAt,
      updatedAt: new Date().toISOString().slice(0, 10),
    });

    const errors = validateTemplate(merged);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const next = [...items];
    next[idx] = merged;
    writeStore(next);
    res.json({ ok: true, item: merged, items: next });
  });

  router.delete("/templates/:id", (req, res) => {
    const id = String(req.params.id || "");
    const items = readStore();
    const next = items.filter((x) => String(x.id) !== id);
    writeStore(next);
    res.json({ ok: true, items: next });
  });

  app.use("/api/ansible", router);
  console.log("[Ansible] module mounted at /api/ansible");
}

module.exports = { initAnsible };