// src/components/SelfServicePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { selfServiceApi } from "@/api/selfServiceApi";
import type { SelfServiceStore, SelfServiceTab, SelfServiceSubTab, SelfServiceItem } from "@/types";
import { normalizeExternalUrl, openExternalUrl } from "@/utils/url";
import SelfServiceItemModal from "@/components/self_service/SelfServiceItemModal";
import SimpleNameModal from "@/components/self_service/SimpleNameModal";

const emptyStore: SelfServiceStore = { version: 1, tabs: [] };

function sortByOrder<T extends { order: number }>(arr: T[]) {
  return [...arr].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export default function SelfServicePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [params, setParams] = useSearchParams();
  const urlTabId = params.get("tab") || "";
  const urlSubTabId = params.get("subtab") || "";
  const urlItemId = params.get("item") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [store, setStore] = useState<SelfServiceStore>(emptyStore);

  // selection
  const [tabId, setTabId] = useState(urlTabId);
  const [subTabId, setSubTabId] = useState(urlSubTabId);
  const [itemId, setItemId] = useState(urlItemId);

  // modals
  const [nameModal, setNameModal] = useState<{
    open: boolean;
    kind: "tab" | "subtab";
    mode: "create" | "edit";
    title: string;
    value: string;
  }>({ open: false, kind: "tab", mode: "create", title: "", value: "" });

  const [itemModal, setItemModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    draft: SelfServiceItem;
  }>({
    open: false,
    mode: "create",
    draft: {
      id: "",
      title: "",
      order: 0,
      tabId: "",
      subTabId: "",
      info: "",
      goUrl: "",
      requestExample: "",
      details: "",
      sample: { type: "link", value: "" },
      extra: "",
    },
  });

  // load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await selfServiceApi.get();
        if (!alive) return;

        setStore(r.store);

        const firstTab = sortByOrder(r.store.tabs)[0];
        const pickedTabId = urlTabId || firstTab?.id || "";
        setTabId(pickedTabId);

        const pickedTab = r.store.tabs.find((t) => t.id === pickedTabId) || firstTab;
        const firstSub = pickedTab ? sortByOrder(pickedTab.subTabs)[0] : undefined;
        const pickedSubId = urlSubTabId || firstSub?.id || "";
        setSubTabId(pickedSubId);

        const pickedSub = pickedTab?.subTabs.find((s) => s.id === pickedSubId) || firstSub;
        const firstItem = pickedSub ? sortByOrder(pickedSub.items)[0] : undefined;
        const pickedItemId = urlItemId || firstItem?.id || "";
        setItemId(pickedItemId);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep url synced
  useEffect(() => {
    setParams((p) => {
      if (tabId) p.set("tab", tabId);
      else p.delete("tab");

      if (subTabId) p.set("subtab", subTabId);
      else p.delete("subtab");

      if (itemId) p.set("item", itemId);
      else p.delete("item");

      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, subTabId, itemId]);

  const tabs = useMemo(() => sortByOrder(store.tabs), [store.tabs]);

  const selectedTab: SelfServiceTab | undefined = useMemo(() => {
    return store.tabs.find((t) => t.id === tabId) || tabs[0];
  }, [store.tabs, tabId, tabs]);

  const subTabs = useMemo(() => sortByOrder(selectedTab?.subTabs || []), [selectedTab?.subTabs]);

  const selectedSub: SelfServiceSubTab | undefined = useMemo(() => {
    return selectedTab?.subTabs.find((s) => s.id === subTabId) || subTabs[0];
  }, [selectedTab?.subTabs, subTabId, subTabs]);

  const items = useMemo(() => sortByOrder(selectedSub?.items || []), [selectedSub?.items]);

  const selectedItem: SelfServiceItem | undefined = useMemo(() => {
    return selectedSub?.items.find((it) => it.id === itemId) || items[0];
  }, [selectedSub?.items, itemId, items]);

  const normalizedGo = useMemo(() => normalizeExternalUrl(selectedItem?.goUrl || ""), [selectedItem?.goUrl]);

  // -------- helpers: optimistic setStore and keep selection ----------
  const applyStore = (next: SelfServiceStore, keep?: { tabId?: string; subTabId?: string; itemId?: string }) => {
    setStore(next);

    const kt = keep?.tabId || tabId;
    const ks = keep?.subTabId || subTabId;
    const ki = keep?.itemId || itemId;

    const t = next.tabs.find((x) => x.id === kt) || sortByOrder(next.tabs)[0];
    const tId = t?.id || "";
    setTabId(tId);

    const s = t?.subTabs.find((x) => x.id === ks) || sortByOrder(t?.subTabs || [])[0];
    const sId = s?.id || "";
    setSubTabId(sId);

    const it = s?.items.find((x) => x.id === ki) || sortByOrder(s?.items || [])[0];
    setItemId(it?.id || "");
  };

  // -------- reorder up/down ----------
  const moveUpDown = async (
    kind: "tab" | "subTab" | "item",
    id: string,
    dir: -1 | 1
  ) => {
    try {
      setErr("");
      if (kind === "tab") {
        const list = sortByOrder(store.tabs);
        const idx = list.findIndex((x) => x.id === id);
        const swap = idx + dir;
        if (idx < 0 || swap < 0 || swap >= list.length) return;
        [list[idx], list[swap]] = [list[swap], list[idx]];
        const r = await selfServiceApi.reorder({ kind: "tab", orderedIds: list.map((x) => x.id) });
        applyStore(r.store, { tabId });
        return;
      }

      if (kind === "subTab") {
        if (!selectedTab) return;
        const list = sortByOrder(selectedTab.subTabs);
        const idx = list.findIndex((x) => x.id === id);
        const swap = idx + dir;
        if (idx < 0 || swap < 0 || swap >= list.length) return;
        [list[idx], list[swap]] = [list[swap], list[idx]];
        const r = await selfServiceApi.reorder({
          kind: "subTab",
          scope: { tabId: selectedTab.id },
          orderedIds: list.map((x) => x.id),
        });
        applyStore(r.store, { tabId: selectedTab.id, subTabId });
        return;
      }

      if (kind === "item") {
        if (!selectedTab || !selectedSub) return;
        const list = sortByOrder(selectedSub.items);
        const idx = list.findIndex((x) => x.id === id);
        const swap = idx + dir;
        if (idx < 0 || swap < 0 || swap >= list.length) return;
        [list[idx], list[swap]] = [list[swap], list[idx]];
        const r = await selfServiceApi.reorder({
          kind: "item",
          scope: { tabId: selectedTab.id, subTabId: selectedSub.id },
          orderedIds: list.map((x) => x.id),
        });
        applyStore(r.store, { tabId: selectedTab.id, subTabId: selectedSub.id, itemId });
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  // -------- CRUD: Tabs/Subtabs ----------
  const openCreateTab = () => {
    setNameModal({ open: true, kind: "tab", mode: "create", title: "New Tab", value: "" });
  };

  const openEditTab = () => {
    if (!selectedTab) return;
    setNameModal({ open: true, kind: "tab", mode: "edit", title: "Edit Tab", value: selectedTab.name });
  };

  const openCreateSubTab = () => {
    if (!selectedTab) return;
    setNameModal({ open: true, kind: "subtab", mode: "create", title: "New Sub Tab", value: "" });
  };

  const openEditSubTab = () => {
    if (!selectedTab || !selectedSub) return;
    setNameModal({ open: true, kind: "subtab", mode: "edit", title: "Edit Sub Tab", value: selectedSub.name });
  };

  const saveNameModal = async (name: string) => {
    try {
      setErr("");
      if (!isAdmin) return;

      if (nameModal.kind === "tab") {
        if (nameModal.mode === "create") {
          const r = await selfServiceApi.createTab({ name });
          applyStore(r.store, { tabId: r.tab.id });
        } else {
          if (!selectedTab) return;
          const r = await selfServiceApi.updateTab(selectedTab.id, { name });
          applyStore(r.store, { tabId: selectedTab.id });
        }
      } else {
        if (!selectedTab) return;

        if (nameModal.mode === "create") {
          const r = await selfServiceApi.createSubTab(selectedTab.id, { name });
          applyStore(r.store, { tabId: selectedTab.id, subTabId: r.subTab.id });
        } else {
          if (!selectedSub) return;
          const r = await selfServiceApi.updateSubTab(selectedTab.id, selectedSub.id, { name });
          applyStore(r.store, { tabId: selectedTab.id, subTabId: selectedSub.id });
        }
      }

      setNameModal((m) => ({ ...m, open: false }));
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const deleteTab = async () => {
    if (!isAdmin || !selectedTab) return;
    const ok = window.confirm(`Delete tab "${selectedTab.name}"? (subtabs+items will be deleted)`);
    if (!ok) return;
    try {
      setErr("");
      const r = await selfServiceApi.deleteTab(selectedTab.id);
      applyStore(r.store);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const deleteSubTab = async () => {
    if (!isAdmin || !selectedTab || !selectedSub) return;
    const ok = window.confirm(`Delete sub tab "${selectedSub.name}"? (items will be deleted)`);
    if (!ok) return;
    try {
      setErr("");
      const r = await selfServiceApi.deleteSubTab(selectedTab.id, selectedSub.id);
      applyStore(r.store, { tabId: selectedTab.id });
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  // -------- CRUD: Items ----------
  const openCreateItem = () => {
    if (!selectedTab || !selectedSub) return;
    setItemModal({
      open: true,
      mode: "create",
      draft: {
        id: "",
        title: "",
        order: 0,
        tabId: selectedTab.id,
        subTabId: selectedSub.id,
        info: "",
        goUrl: "",
        requestExample: "",
        details: "",
        sample: { type: "link", value: "" },
        extra: "",
      },
    });
  };

  const openEditItem = () => {
    if (!selectedItem) return;
    setItemModal({ open: true, mode: "edit", draft: { ...selectedItem } });
  };

  const saveItem = async (draft: SelfServiceItem) => {
    try {
      setErr("");
      if (!isAdmin) return;
      if (!selectedTab || !selectedSub) return;

      // keep server security rules in mind:
      // - goUrl required
      // - requestExample required
      // - sample required
      const payload: Partial<SelfServiceItem> = {
        title: draft.title,
        info: draft.info,
        goUrl: draft.goUrl,
        requestExample: draft.requestExample,
        details: draft.details,
        sample: draft.sample,
        extra: draft.extra,
      };

      if (itemModal.mode === "create") {
        const r = await selfServiceApi.createItem(selectedTab.id, selectedSub.id, payload);
        applyStore(r.store, { tabId: selectedTab.id, subTabId: selectedSub.id, itemId: r.item.id });
      } else {
        const r = await selfServiceApi.updateItem(selectedTab.id, selectedSub.id, draft.id, payload);
        applyStore(r.store, { tabId: selectedTab.id, subTabId: selectedSub.id, itemId: r.item.id });
      }

      setItemModal((m) => ({ ...m, open: false }));
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const deleteItem = async () => {
    if (!isAdmin || !selectedTab || !selectedSub || !selectedItem) return;
    const ok = window.confirm(`Delete item "${selectedItem.title}"?`);
    if (!ok) return;

    try {
      setErr("");
      const r = await selfServiceApi.deleteItem(selectedTab.id, selectedSub.id, selectedItem.id);
      applyStore(r.store, { tabId: selectedTab.id, subTabId: selectedSub.id });
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const copyRequestExample = async () => {
    const text = selectedItem?.requestExample || "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const openGo = () => {
    if (!normalizedGo) return;
    openExternalUrl(normalizedGo);
  };

  if (loading) return <div className="text-sm text-gray-600">Loading...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900">Self Service</h3>
            {isAdmin && (
              <button
                onClick={openCreateTab}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                + Tab
              </button>
            )}
          </div>

          {err && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {err}
            </div>
          )}
        </div>

        {/* Tabs list */}
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs text-gray-600 mb-2">Tabs</div>
          <div className="space-y-1">
            {tabs.map((t) => {
              const active = t.id === selectedTab?.id;
              return (
                <div key={t.id} className={`flex items-center gap-1 rounded-lg ${active ? "bg-blue-50" : ""}`}>
                  <button
                    onClick={() => {
                      setTabId(t.id);
                      const firstSub = sortByOrder(t.subTabs)[0];
                      setSubTabId(firstSub?.id || "");
                      const firstItem = firstSub ? sortByOrder(firstSub.items)[0] : undefined;
                      setItemId(firstItem?.id || "");
                    }}
                    className="flex-1 text-left px-3 py-2 text-sm"
                  >
                    <span className={active ? "text-blue-700 font-semibold" : "text-gray-900"}>{t.name}</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => moveUpDown("tab", t.id, -1)}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => moveUpDown("tab", t.id, 1)}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {tabs.length === 0 && <div className="text-sm text-gray-600 px-3 py-2">No tabs yet.</div>}
          </div>

          {/* tab actions */}
          {isAdmin && selectedTab && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={openEditTab}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              >
                Edit Tab
              </button>
              <button
                onClick={deleteTab}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Delete Tab
              </button>
            </div>
          )}
        </div>

        {/* SubTabs + Items */}
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-gray-600">Sub Tabs</div>
            {isAdmin && selectedTab && (
              <button
                onClick={openCreateSubTab}
                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + SubTab
              </button>
            )}
          </div>

          <div className="mt-2 space-y-1">
            {subTabs.map((s) => {
              const active = s.id === selectedSub?.id;
              return (
                <div key={s.id} className={`flex items-center gap-1 rounded-lg ${active ? "bg-blue-50" : ""}`}>
                  <button
                    onClick={() => {
                      setSubTabId(s.id);
                      const firstItem = sortByOrder(s.items)[0];
                      setItemId(firstItem?.id || "");
                    }}
                    className="flex-1 text-left px-3 py-2 text-sm"
                  >
                    <span className={active ? "text-blue-700 font-semibold" : "text-gray-900"}>{s.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({s.items.length})</span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => moveUpDown("subTab", s.id, -1)}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => moveUpDown("subTab", s.id, 1)}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {selectedTab && subTabs.length === 0 && (
              <div className="text-sm text-gray-600 px-3 py-2">No subtabs yet.</div>
            )}
          </div>

          {isAdmin && selectedTab && selectedSub && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={openEditSubTab}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              >
                Edit SubTab
              </button>
              <button
                onClick={deleteSubTab}
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Delete SubTab
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-600">Items</div>
            {isAdmin && selectedTab && selectedSub && (
              <button
                onClick={openCreateItem}
                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + Item
              </button>
            )}
          </div>

          <div className="mt-2 max-h-[260px] overflow-auto border border-gray-100 rounded-lg">
            {items.map((it) => {
              const active = it.id === selectedItem?.id;
              return (
                <div key={it.id} className={`flex items-center gap-1 border-b border-gray-100 ${active ? "bg-blue-50" : ""}`}>
                  <button
                    onClick={() => setItemId(it.id)}
                    className="flex-1 text-left px-3 py-2 text-sm"
                  >
                    <span className={active ? "text-blue-700 font-semibold" : "text-gray-900"}>
                      {it.title}
                    </span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => moveUpDown("item", it.id, -1)}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                        onClick={() => moveUpDown("item", it.id, 1)}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {selectedSub && items.length === 0 && (
              <div className="p-3 text-sm text-gray-600">No items.</div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{selectedItem?.title || "Select an item"}</p>
            <p className="text-xs text-gray-600 mt-1">
              {selectedTab?.name || ""}{selectedSub ? ` / ${selectedSub.name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openGo}
              disabled={!normalizedGo}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50"
              title={normalizedGo || "No goUrl"}
            >
              Go
            </button>

            <button
              onClick={copyRequestExample}
              disabled={!selectedItem?.requestExample}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              Copy Request Example
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={openEditItem}
                  disabled={!selectedItem}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={deleteItem}
                  disabled={!selectedItem}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {!selectedItem ? (
          <div className="p-4 text-sm text-gray-600">Select an item from the left panel.</div>
        ) : (
          <div className="p-4 space-y-4">
            {selectedItem.info ? (
              <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-semibold text-blue-800 mb-1">Info</div>
                <div className="text-blue-800 whitespace-pre-wrap">{selectedItem.info}</div>
              </div>
            ) : null}

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-2">Request Example (required)</div>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">
                <code>{selectedItem.requestExample}</code>
              </pre>
            </div>

            {selectedItem.details ? (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-2">Details</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{selectedItem.details}</div>
              </div>
            ) : null}

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-2">Sample (required)</div>
              {selectedItem.sample.type === "link" ? (
                <button
                  className="text-sm text-blue-700 underline"
                  onClick={() => openExternalUrl(selectedItem.sample.value)}
                >
                  {normalizeExternalUrl(selectedItem.sample.value)}
                </button>
              ) : (
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">
                  <code>{selectedItem.sample.value}</code>
                </pre>
              )}
            </div>

            {selectedItem.extra ? (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-2">Extra</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{selectedItem.extra}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Modals */}
      <SimpleNameModal
        open={nameModal.open}
        title={nameModal.title}
        initialValue={nameModal.value}
        onClose={() => setNameModal((m) => ({ ...m, open: false }))}
        onSave={saveNameModal}
      />

      <SelfServiceItemModal
        open={itemModal.open}
        mode={itemModal.mode}
        draft={itemModal.draft}
        onClose={() => setItemModal((m) => ({ ...m, open: false }))}
        onSave={saveItem}
      />
    </div>
  );
}