// server/selfservice/store.cjs
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "selfservice.json");

// bump when schema changes
const SCHEMA_VERSION = 1;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ version: SCHEMA_VERSION, tabs: [] }, null, 2),
      "utf-8"
    );
  }
}

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStr(x) {
  return String(x ?? "").trim();
}

/**
 * Security: normalize url and block javascript:, data: etc.
 */
function normalizeExternalUrl(raw) {
  const v = normalizeStr(raw);
  if (!v) return "";

  const lower = v.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "";
  }

  if (v.startsWith("//")) return `https:${v}`;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return v;
  return `https://${v}`;
}

/**
 * Backwards compatibility / migrations
 * - If file is array => interpret as legacy flat items list (rare), convert into one tab/subtab.
 * - Field renames:
 *    - linkUrl -> goUrl
 *    - requestTemplate -> requestExample
 *    - sampleLink/sampleText -> sample
 */
function migrateToV1(data) {
  // already good
  if (data && typeof data === "object" && Array.isArray(data.tabs) && data.version === 1) {
    return data;
  }

  // legacy: missing version but object
  if (data && typeof data === "object" && Array.isArray(data.tabs)) {
    return { version: 1, tabs: data.tabs };
  }

  // legacy: flat array
  if (Array.isArray(data)) {
    const tabId = uid();
    const subTabId = uid();

    const items = data.map((x, i) => normalizeItem({ ...x, tabId, subTabId, order: i + 1 }));
    return {
      version: 1,
      tabs: [
        normalizeTab({
          id: tabId,
          name: "Legacy",
          order: 1,
          subTabs: [
            normalizeSubTab({
              id: subTabId,
              name: "Legacy Items",
              order: 1,
              items,
            }),
          ],
        }),
      ],
    };
  }

  // empty fallback
  return { version: 1, tabs: [] };
}

function normalizeSample(raw) {
  // required: { type: "link"|"text", value: string }
  const type = normalizeStr(raw?.type);
  const value = normalizeStr(raw?.value);

  // legacy helpers
  const sampleLink = normalizeStr(raw?.sampleLink);
  const sampleText = normalizeStr(raw?.sampleText);

  if (!type && (sampleLink || sampleText)) {
    if (sampleLink) return { type: "link", value: normalizeExternalUrl(sampleLink) };
    return { type: "text", value: sampleText };
  }

  if (type === "link") return { type: "link", value: normalizeExternalUrl(value) };
  if (type === "text") return { type: "text", value };
  // default (still invalid if empty - validation will catch)
  return { type: "text", value };
}

function normalizeItem(raw) {
  // required fields: goUrl, requestExample, sample, tabId, subTabId
  const legacyLink = normalizeStr(raw?.linkUrl);
  const goUrl = normalizeExternalUrl(raw?.goUrl || legacyLink);

  const legacyReq = normalizeStr(raw?.requestTemplate);
  const requestExample = normalizeStr(raw?.requestExample || legacyReq);

  const item = {
    id: normalizeStr(raw?.id) || uid(),
    title: normalizeStr(raw?.title || raw?.name || "Untitled"),
    order: Number(raw?.order ?? 0) || 0,

    // indexes required
    tabId: normalizeStr(raw?.tabId),
    subTabId: normalizeStr(raw?.subTabId),

    info: normalizeStr(raw?.info),
    goUrl,
    requestExample,
    details: normalizeStr(raw?.details),
    sample: normalizeSample(raw?.sample || raw),
    extra: normalizeStr(raw?.extra),
  };

  return item;
}

function normalizeSubTab(raw) {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeItem) : [];
  return {
    id: normalizeStr(raw?.id) || uid(),
    name: normalizeStr(raw?.name),
    order: Number(raw?.order ?? 0) || 0,
    items,
  };
}

function normalizeTab(raw) {
  const subTabs = Array.isArray(raw?.subTabs) ? raw.subTabs.map(normalizeSubTab) : [];
  return {
    id: normalizeStr(raw?.id) || uid(),
    name: normalizeStr(raw?.name),
    order: Number(raw?.order ?? 0) || 0,
    subTabs,
  };
}

function normalizeStore(raw) {
  const migrated = migrateToV1(raw);

  const tabs = Array.isArray(migrated.tabs) ? migrated.tabs.map(normalizeTab) : [];

  // ensure orders stable: if order missing, assign based on position
  tabs.forEach((t, i) => {
    if (!t.order) t.order = i + 1;
    t.subTabs.forEach((st, j) => {
      if (!st.order) st.order = j + 1;
      st.items.forEach((it, k) => {
        if (!it.order) it.order = k + 1;
      });
    });
  });

  return { version: 1, tabs };
}

function sortStore(store) {
  const tabs = [...store.tabs].sort((a, b) => a.order - b.order);
  for (const t of tabs) {
    t.subTabs = [...t.subTabs].sort((a, b) => a.order - b.order);
    for (const st of t.subTabs) {
      st.items = [...st.items].sort((a, b) => a.order - b.order);
    }
  }
  return { ...store, tabs };
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const parsed = safeParse(raw, { version: 1, tabs: [] });
  const normalized = normalizeStore(parsed);
  return sortStore(normalized);
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function validateTab(tab) {
  const e = [];
  if (!normalizeStr(tab.name)) e.push("tab.name required");
  return e;
}

function validateSubTab(subTab) {
  const e = [];
  if (!normalizeStr(subTab.name)) e.push("subTab.name required");
  return e;
}

function validateItem(item) {
  const e = [];
  if (!normalizeStr(item.title)) e.push("item.title required");

  if (!normalizeStr(item.tabId)) e.push("item.tabId required");
  if (!normalizeStr(item.subTabId)) e.push("item.subTabId required");

  if (!normalizeStr(item.goUrl)) e.push("item.goUrl required");
  if (!normalizeStr(item.requestExample)) e.push("item.requestExample required");

  if (!item.sample || !normalizeStr(item.sample.type) || !normalizeStr(item.sample.value)) {
    e.push("item.sample required");
  } else {
    const t = String(item.sample.type);
    if (t !== "link" && t !== "text") e.push("item.sample.type must be link|text");
    if (t === "link" && !normalizeExternalUrl(item.sample.value)) e.push("item.sample.link invalid");
  }

  return e;
}

module.exports = {
  DATA_FILE,
  SCHEMA_VERSION,
  readStore,
  writeStore,
  normalizeStore,
  normalizeTab,
  normalizeSubTab,
  normalizeItem,
  validateTab,
  validateSubTab,
  validateItem,
  uid,
  normalizeExternalUrl,
  sortStore,
};