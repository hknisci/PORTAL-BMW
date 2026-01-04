// server/ansible/store.cjs
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "ansible-templates.json");

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

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStr(x) {
  return String(x ?? "").trim();
}

function normalizeTemplate(raw) {
  const now = new Date().toISOString();

  // ✅ backward + forward compatible:
  // UI/legacy datada linkUrl var, yeni UI goUrl gönderebilir.
  const linkUrl = normalizeStr(raw.linkUrl) || normalizeStr(raw.goUrl);
  const goUrl = normalizeStr(raw.goUrl) || linkUrl;

  return {
    id: normalizeStr(raw.id) || uid(),
    name: normalizeStr(raw.name),
    owner: normalizeStr(raw.owner),

    description: normalizeStr(raw.description),
    purpose: normalizeStr(raw.purpose),
    notes: normalizeStr(raw.notes),
    surveyInfo: normalizeStr(raw.surveyInfo),

    tags: Array.isArray(raw.tags) ? raw.tags.map(normalizeStr).filter(Boolean) : [],

    content: normalizeStr(raw.content),

    // ✅ store'a linkUrl yaz (mevcut datayla uyum)
    linkUrl,
    // ✅ response/ilerisi için opsiyonel mirror
    goUrl,

    updatedAt: normalizeStr(raw.updatedAt) || now.slice(0, 10),
    createdAt: normalizeStr(raw.createdAt) || now,
  };
}

function validateTemplate(t) {
  const e = [];
  if (!t.name) e.push("name required");
  if (!t.owner) e.push("owner required");
  if (!t.content) e.push("content required");
  return e;
}

module.exports = {
  DATA_FILE,
  readStore,
  writeStore,
  normalizeTemplate,
  validateTemplate,
  uid,
};