// server/selfservice/index.cjs
const express = require("express");
const {
  readStore,
  writeStore,
  normalizeTab,
  normalizeSubTab,
  normalizeItem,
  validateTab,
  validateSubTab,
  validateItem,
  sortStore,
} = require("./store.cjs");

function maxOrder(list) {
  const nums = (list || []).map((x) => Number(x.order || 0)).filter((n) => Number.isFinite(n));
  return nums.length ? Math.max(...nums) : 0;
}

function initSelfService(app) {
  const router = express.Router();
  router.use(express.json({ limit: "2mb" }));

  router.get("/health", (req, res) => {
    res.json({ ok: true, service: "selfservice" });
  });

  // GET full store
  router.get("/", (req, res) => {
    const store = readStore();
    res.json({ ok: true, store });
  });

  // ---------------- TAB CRUD ----------------
  router.post("/tabs", (req, res) => {
    const store = readStore();
    const tab = normalizeTab(req.body || {});
    tab.order = tab.order || (maxOrder(store.tabs) + 1);

    const errors = validateTab(tab);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const next = sortStore({ ...store, tabs: [tab, ...store.tabs] });
    writeStore(next);
    res.json({ ok: true, store: next, tab });
  });

  router.put("/tabs/:tabId", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const idx = store.tabs.findIndex((t) => String(t.id) === tabId);
    if (idx < 0) return res.status(404).json({ ok: false, error: "tab not found" });

    const merged = normalizeTab({
      ...store.tabs[idx],
      ...req.body,
      id: tabId,
    });

    const errors = validateTab(merged);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const tabs = [...store.tabs];
    tabs[idx] = merged;

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next, tab: merged });
  });

  router.delete("/tabs/:tabId", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const tabs = store.tabs.filter((t) => String(t.id) !== tabId);
    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next });
  });

  // ---------------- SUBTAB CRUD ----------------
  router.post("/tabs/:tabId/subtabs", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const tab = store.tabs.find((t) => String(t.id) === tabId);
    if (!tab) return res.status(404).json({ ok: false, error: "tab not found" });

    const subTab = normalizeSubTab(req.body || {});
    subTab.order = subTab.order || (maxOrder(tab.subTabs) + 1);

    const errors = validateSubTab(subTab);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const tabs = store.tabs.map((t) => {
      if (String(t.id) !== tabId) return t;
      return { ...t, subTabs: [subTab, ...t.subTabs] };
    });

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next, subTab });
  });

  router.put("/tabs/:tabId/subtabs/:subTabId", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const subTabId = String(req.params.subTabId || "");

    const tabIdx = store.tabs.findIndex((t) => String(t.id) === tabId);
    if (tabIdx < 0) return res.status(404).json({ ok: false, error: "tab not found" });

    const tab = store.tabs[tabIdx];
    const subIdx = tab.subTabs.findIndex((s) => String(s.id) === subTabId);
    if (subIdx < 0) return res.status(404).json({ ok: false, error: "subTab not found" });

    const merged = normalizeSubTab({
      ...tab.subTabs[subIdx],
      ...req.body,
      id: subTabId,
    });

    const errors = validateSubTab(merged);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const tabs = [...store.tabs];
    const subTabs = [...tab.subTabs];
    subTabs[subIdx] = merged;
    tabs[tabIdx] = { ...tab, subTabs };

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next, subTab: merged });
  });

  router.delete("/tabs/:tabId/subtabs/:subTabId", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const subTabId = String(req.params.subTabId || "");

    const tabs = store.tabs.map((t) => {
      if (String(t.id) !== tabId) return t;
      return { ...t, subTabs: t.subTabs.filter((s) => String(s.id) !== subTabId) };
    });

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next });
  });

  // ---------------- ITEM CRUD ----------------
  router.post("/tabs/:tabId/subtabs/:subTabId/items", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const subTabId = String(req.params.subTabId || "");

    const tab = store.tabs.find((t) => String(t.id) === tabId);
    if (!tab) return res.status(404).json({ ok: false, error: "tab not found" });

    const sub = tab.subTabs.find((s) => String(s.id) === subTabId);
    if (!sub) return res.status(404).json({ ok: false, error: "subTab not found" });

    const item = normalizeItem({ ...(req.body || {}), tabId, subTabId });
    item.order = item.order || (maxOrder(sub.items) + 1);

    const errors = validateItem(item);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const tabs = store.tabs.map((t) => {
      if (String(t.id) !== tabId) return t;
      return {
        ...t,
        subTabs: t.subTabs.map((s) => {
          if (String(s.id) !== subTabId) return s;
          return { ...s, items: [item, ...s.items] };
        }),
      };
    });

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next, item });
  });

  router.put("/tabs/:tabId/subtabs/:subTabId/items/:itemId", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const subTabId = String(req.params.subTabId || "");
    const itemId = String(req.params.itemId || "");

    const tabIdx = store.tabs.findIndex((t) => String(t.id) === tabId);
    if (tabIdx < 0) return res.status(404).json({ ok: false, error: "tab not found" });

    const tab = store.tabs[tabIdx];
    const subIdx = tab.subTabs.findIndex((s) => String(s.id) === subTabId);
    if (subIdx < 0) return res.status(404).json({ ok: false, error: "subTab not found" });

    const sub = tab.subTabs[subIdx];
    const itemIdx = sub.items.findIndex((it) => String(it.id) === itemId);
    if (itemIdx < 0) return res.status(404).json({ ok: false, error: "item not found" });

    const merged = normalizeItem({
      ...sub.items[itemIdx],
      ...req.body,
      id: itemId,
      tabId,
      subTabId,
    });

    const errors = validateItem(merged);
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(", ") });

    const tabs = [...store.tabs];
    const subTabs = [...tab.subTabs];
    const items = [...sub.items];
    items[itemIdx] = merged;
    subTabs[subIdx] = { ...sub, items };
    tabs[tabIdx] = { ...tab, subTabs };

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next, item: merged });
  });

  router.delete("/tabs/:tabId/subtabs/:subTabId/items/:itemId", (req, res) => {
    const store = readStore();
    const tabId = String(req.params.tabId || "");
    const subTabId = String(req.params.subTabId || "");
    const itemId = String(req.params.itemId || "");

    const tabs = store.tabs.map((t) => {
      if (String(t.id) !== tabId) return t;
      return {
        ...t,
        subTabs: t.subTabs.map((s) => {
          if (String(s.id) !== subTabId) return s;
          return { ...s, items: s.items.filter((it) => String(it.id) !== itemId) };
        }),
      };
    });

    const next = sortStore({ ...store, tabs });
    writeStore(next);
    res.json({ ok: true, store: next });
  });

  // ---------------- REORDER (generic) ----------------
  // payload: { kind: "tab"|"subTab"|"item", scope?: {tabId, subTabId}, orderedIds: string[] }
  router.post("/reorder", (req, res) => {
    const store = readStore();
    const kind = String(req.body?.kind || "");
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map(String) : [];
    const scope = req.body?.scope || {};

    if (!orderedIds.length) return res.status(400).json({ ok: false, error: "orderedIds required" });

    let next = store;

    if (kind === "tab") {
      const map = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
      next = {
        ...store,
        tabs: store.tabs.map((t) => (map.has(String(t.id)) ? { ...t, order: map.get(String(t.id)) } : t)),
      };
    } else if (kind === "subTab") {
      const tabId = String(scope.tabId || "");
      if (!tabId) return res.status(400).json({ ok: false, error: "scope.tabId required" });

      const map = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
      next = {
        ...store,
        tabs: store.tabs.map((t) => {
          if (String(t.id) !== tabId) return t;
          return {
            ...t,
            subTabs: t.subTabs.map((s) =>
              map.has(String(s.id)) ? { ...s, order: map.get(String(s.id)) } : s
            ),
          };
        }),
      };
    } else if (kind === "item") {
      const tabId = String(scope.tabId || "");
      const subTabId = String(scope.subTabId || "");
      if (!tabId || !subTabId) return res.status(400).json({ ok: false, error: "scope.tabId & scope.subTabId required" });

      const map = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
      next = {
        ...store,
        tabs: store.tabs.map((t) => {
          if (String(t.id) !== tabId) return t;
          return {
            ...t,
            subTabs: t.subTabs.map((s) => {
              if (String(s.id) !== subTabId) return s;
              return {
                ...s,
                items: s.items.map((it) =>
                  map.has(String(it.id)) ? { ...it, order: map.get(String(it.id)) } : it
                ),
              };
            }),
          };
        }),
      };
    } else {
      return res.status(400).json({ ok: false, error: "kind must be tab|subTab|item" });
    }

    next = sortStore(next);
    writeStore(next);
    res.json({ ok: true, store: next });
  });

  app.use("/api/selfservice", router);
  console.log("[SelfService] module mounted at /api/selfservice");
}

module.exports = { initSelfService };