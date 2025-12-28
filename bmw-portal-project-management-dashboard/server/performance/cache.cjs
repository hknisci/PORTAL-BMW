// server/performance/cache.cjs
const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "..", "data", "performance-cache.json");
const CONFIG_FILE = path.join(__dirname, "..", "data", "performance-config.json");

function ensureDirAndFile(filePath, seedValue) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(seedValue, null, 2), "utf8");
}

function safeReadJson(filePath, fallback) {
  try {
    ensureDirAndFile(filePath, fallback);
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw || !raw.trim()) return fallback;
    const parsed = JSON.parse(raw);
    // bazı dosyalarda yanlışlıkla [] oluşmuş → fallback'e dön
    if (Array.isArray(parsed)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function safeWriteJson(filePath, obj) {
  ensureDirAndFile(filePath, obj);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

function readCache() {
  return safeReadJson(CACHE_FILE, {
    updatedAt: null,
    provider: "mock",
    data: {},
    lastError: null,
  });
}

function writeCache(next) {
  safeWriteJson(CACHE_FILE, next);
}

function readConfig() {
  return safeReadJson(CONFIG_FILE, {
    enabled: true,
    provider: "mock",
    intervalSeconds: 60,
    products: ["httpd", "nginx", "jboss", "websphere", "ctg", "hazelcast", "provenir"],
    dynatrace: { baseUrl: "", apiToken: "" },
    splunk: { baseUrl: "", token: "" },
  });
}

function writeConfig(next) {
  safeWriteJson(CONFIG_FILE, next);
}

module.exports = {
  CACHE_FILE,
  CONFIG_FILE,
  readCache,
  writeCache,
  readConfig,
  writeConfig,
};