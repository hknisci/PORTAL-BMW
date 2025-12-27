const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "5mb" }));

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "duty-roster.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(items) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
}

function stableKey(x) {
  return `${x.date}::${String(x.email || "").toLowerCase()}`;
}

function mergeByDateEmail(base, incoming) {
  const map = new Map();
  for (const x of base) map.set(stableKey(x), x);
  for (const x of incoming) map.set(stableKey(x), x);
  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeItem(x) {
  return {
    id: x.id || uid(),
    date: String(x.date || "").slice(0, 10),
    firstName: String(x.firstName || "").trim(),
    lastName: String(x.lastName || "").trim(),
    phone: String(x.phone || "").trim(),
    email: String(x.email || "").trim(),
  };
}

function validateItem(x) {
  const e = [];
  if (!x.date || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) e.push("date invalid");
  if (!x.firstName) e.push("firstName required");
  if (!x.lastName) e.push("lastName required");
  if (!x.phone) e.push("phone required");
  if (!x.email) e.push("email required");
  if (x.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) e.push("email invalid");
  return e;
}

app.get("/api/duty-roster", (req, res) => {
  const items = readStore();
  res.json(items);
});

app.post("/api/duty-roster/upsert", (req, res) => {
  const item = normalizeItem(req.body || {});
  const errors = validateItem(item);
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

  const existing = readStore();
  const next = mergeByDateEmail(existing, [item]);
  writeStore(next);
  res.json({ ok: true, items: next });
});

app.post("/api/duty-roster/import", (req, res) => {
  const incomingRaw = Array.isArray(req.body?.items) ? req.body.items : [];
  const incoming = incomingRaw.map(normalizeItem);

  const valid = [];
  for (const it of incoming) {
    if (validateItem(it).length === 0) valid.push(it);
  }
  if (valid.length === 0) return res.status(400).json({ ok: false, error: "No valid rows" });

  const existing = readStore();
  const next = mergeByDateEmail(existing, valid);
  writeStore(next);
  res.json({ ok: true, items: next });
});

app.delete("/api/duty-roster/:id", (req, res) => {
  const id = String(req.params.id || "");
  const existing = readStore();
  const next = existing.filter((x) => String(x.id) !== id);
  writeStore(next);
  res.json({ ok: true, items: next });
});

const PORT = Number(process.env.PORT || 5055);
app.listen(PORT, () => {
  console.log(`[DutyRosterAPI] running on http://localhost:${PORT}`);
  console.log(`[DutyRosterAPI] data file: ${DATA_FILE}`);
});


// ========== ASKGT STORE ==========
const ASKGT_FILE = path.join(__dirname, "data", "askgt-articles.json");

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function ensureFile(filePath, seedValue) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(seedValue, null, 2), "utf8");
}

function readAskGT() {
  ensureFile(ASKGT_FILE, []);
  const raw = fs.readFileSync(ASKGT_FILE, "utf8");
  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeAskGT(items) {
  ensureFile(ASKGT_FILE, []);
  fs.writeFileSync(ASKGT_FILE, JSON.stringify(items, null, 2), "utf8");
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStr(x) {
  return String(x ?? "").trim();
}

function wikiUrlFromTitle(title) {
  // En basit/sağlam: title -> Wikipedia sayfası
  const t = normalizeStr(title).replace(/\s+/g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(t)}`;
}

// ========== ASKGT ROUTES ==========
app.get("/api/askgt/articles", (req, res) => {
  const category = normalizeStr(req.query.category);
  const q = normalizeStr(req.query.q).toLowerCase();

  let items = readAskGT();

  if (category) items = items.filter((a) => String(a.category) === category);

  if (q) {
    items = items.filter((a) => {
      const hay = [
        a.title,
        a.description,
        a.content,
        a.author?.name,
        ...(Array.isArray(a.tags) ? a.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  // publishDate desc
  items.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  res.json(items);
});

app.post("/api/askgt/articles/upsert", (req, res) => {
  const incoming = req.body || {};
  const now = new Date().toISOString();

  const existing = readAskGT();
  const id = normalizeStr(incoming.id) || uid();

  const nextItem = {
    ...incoming,
    id,
    title: normalizeStr(incoming.title),
    description: normalizeStr(incoming.description),
    content: normalizeStr(incoming.content),
    category: normalizeStr(incoming.category) || "jboss",
    tags: Array.isArray(incoming.tags)
      ? incoming.tags.map((t) => normalizeStr(t)).filter(Boolean)
      : [],
    publishDate: normalizeStr(incoming.publishDate) || now.slice(0, 10),
    sourceUrl: normalizeStr(incoming.sourceUrl) || wikiUrlFromTitle(incoming.title),
    updatedAt: now,
    createdAt: incoming.createdAt || now,
  };

  const idx = existing.findIndex((x) => String(x.id) === String(id));
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...nextItem, createdAt: existing[idx].createdAt || now };
  } else {
    existing.unshift(nextItem);
  }

  writeAskGT(existing);
  res.json({ ok: true, items: existing });
});

app.post("/api/askgt/articles/import", (req, res) => {
  const list = Array.isArray(req.body?.items) ? req.body.items : [];
  const now = new Date().toISOString();

  const existing = readAskGT();
  const map = new Map(existing.map((x) => [String(x.id), x]));

  for (const raw of list) {
    const id = normalizeStr(raw.id) || uid();
    const merged = {
      ...map.get(String(id)),
      ...raw,
      id,
      title: normalizeStr(raw.title),
      description: normalizeStr(raw.description),
      content: normalizeStr(raw.content),
      category: normalizeStr(raw.category) || "jboss",
      tags: Array.isArray(raw.tags) ? raw.tags.map((t) => normalizeStr(t)).filter(Boolean) : [],
      publishDate: normalizeStr(raw.publishDate) || now.slice(0, 10),
      sourceUrl: normalizeStr(raw.sourceUrl) || wikiUrlFromTitle(raw.title),
      updatedAt: now,
      createdAt: raw.createdAt || map.get(String(id))?.createdAt || now,
    };
    map.set(String(id), merged);
  }

  const next = Array.from(map.values()).sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );

  writeAskGT(next);
  res.json({ ok: true, items: next });
});

app.delete("/api/askgt/articles/:id", (req, res) => {
  const id = normalizeStr(req.params.id);
  const existing = readAskGT();
  const next = existing.filter((x) => String(x.id) !== String(id));
  writeAskGT(next);
  res.json({ ok: true, items: next });
});