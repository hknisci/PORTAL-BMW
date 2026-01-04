// src/components/ansible_tabs/TemplatesTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AnsibleTemplate } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ansibleTemplatesApi } from "@/api/ansibleTemplatesApi";
import { openExternalUrl, normalizeExternalUrl } from "@/utils/url";

import TagFilter from "./TagFilter";
import TemplateEditorModal from "./TemplateEditorModal";

type Mode = "view" | "create" | "edit";

const emptyDraft = (): AnsibleTemplate => ({
  id: "",
  name: "",
  description: "",
  tags: [],
  owner: "",
  updatedAt: "",
  createdAt: "",
  content: "",
  // ✅ legacy + new
  linkUrl: "",
  goUrl: "",
  purpose: "",
  notes: "",
  surveyInfo: "",
});

export default function TemplatesTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [params, setParams] = useSearchParams();
  const urlSelectedId = params.get("template") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [items, setItems] = useState<AnsibleTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string>(urlSelectedId);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<AnsibleTemplate>(emptyDraft());

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await ansibleTemplatesApi.list();
        if (!alive) return;

        setItems(r.items);

        const firstId = r.items[0]?.id || "";
        const pick = urlSelectedId || firstId;

        setSelectedId(pick);
        if (pick) {
          setParams((p) => {
            p.set("template", pick);
            return p;
          });
        }
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

  useEffect(() => {
    if (!selectedId) return;
    setParams((p) => {
      p.set("template", selectedId);
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of items) for (const tag of t.tags ?? []) set.add(tag);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((t) => {
      const matchesQuery = !q
        ? true
        : [
            t.name,
            t.description ?? "",
            (t.tags ?? []).join(" "),
            t.owner ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);

      const matchesTag = !tagFilter ? true : (t.tags ?? []).includes(tagFilter);
      return matchesQuery && matchesTag;
    });
  }, [items, query, tagFilter]);

  const selected: AnsibleTemplate | undefined = useMemo(() => {
    const fromAll = items.find((t) => t.id === selectedId);
    if (fromAll) return fromAll;
    return filtered[0];
  }, [items, selectedId, filtered]);

  // ✅ linkUrl || goUrl (backend hangi alanı dönerse dönsün)
  const selectedRawUrl = useMemo(() => {
    return (selected?.linkUrl || selected?.goUrl || "").trim();
  }, [selected?.linkUrl, selected?.goUrl]);

  const normalizedGoUrl = useMemo(() => {
    return normalizeExternalUrl(selectedRawUrl);
  }, [selectedRawUrl]);

  const openCreate = () => {
    setMode("create");
    setDraft({
      ...emptyDraft(),
      owner: user?.username || "Admin",
      tags: [],
      content: "---\n",
    });
  };

  const openEdit = () => {
    if (!selected) return;
    setMode("edit");
    setDraft({
      ...emptyDraft(),
      ...selected,
      tags: selected.tags ?? [],
      // ✅ edit açıldığında da url alanını normalize şekilde taşıyalım
      linkUrl: selected.linkUrl ?? "",
      goUrl: selected.goUrl ?? "",
    });
  };

  const closeModal = () => {
    setMode("view");
    setDraft(emptyDraft());
  };

  const save = async () => {
    try {
      setErr("");

      // ✅ tek kaynak: linkUrl alanına kaydet (backend şu an bunu kullanıyor)
      const raw = (draft.linkUrl || draft.goUrl || "").trim();
      const normalizedLink = normalizeExternalUrl(raw);

      const payload = {
        name: draft.name,
        description: draft.description,
        purpose: draft.purpose,
        notes: draft.notes,
        surveyInfo: draft.surveyInfo,
        tags: draft.tags ?? [],
        owner: draft.owner,
        content: draft.content,

        // ✅ backend legacy alan
        linkUrl: normalizedLink,

        // ✅ istersen yeni alanı da gönder (backend normalizeTemplate ikisini de kabul ediyor)
        goUrl: normalizedLink,
      };

      if (mode === "create") {
        const r = await ansibleTemplatesApi.create(payload);
        setItems(r.items);
        setSelectedId(r.item.id);
        closeModal();
      } else if (mode === "edit" && selected) {
        const r = await ansibleTemplatesApi.update(selected.id, payload);
        setItems(r.items);
        closeModal();
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const del = async () => {
    if (!selected) return;
    const ok = window.confirm(`Delete template "${selected.name}"?`);
    if (!ok) return;

    try {
      setErr("");
      const r = await ansibleTemplatesApi.remove(selected.id);
      setItems(r.items);
      const nextId = r.items[0]?.id || "";
      setSelectedId(nextId);
      setMode("view");
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const copyYaml = async () => {
    const text = selected?.content ?? "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const copyLink = async () => {
    const id = selected?.id || selectedId;
    if (!id) return;
    const u = new URL(window.location.href);
    u.searchParams.set("template", id);
    await navigator.clipboard.writeText(u.toString());
  };

  const openExternal = () => {
    if (!normalizedGoUrl) return;
    openExternalUrl(normalizedGoUrl);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: list */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">Templates</h3>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                title="Add template"
              >
                + Add
              </button>
            )}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search template..."
            className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <TagFilter allTags={allTags} value={tagFilter} onChange={setTagFilter} />

          {err && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {err}
            </div>
          )}
        </div>

        <div className="max-h-[520px] overflow-auto">
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            filtered.map((t) => {
              const active = t.id === (selected?.id ?? selectedId);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id);
                    setMode("view");
                  }}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                    active ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          active ? "text-blue-700" : "text-gray-900"
                        }`}
                      >
                        {t.name}
                      </p>

                      {t.description && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {t.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-gray-500 whitespace-nowrap">
                      {t.updatedAt ?? ""}
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-4 text-sm text-gray-600">No templates found.</div>
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {selected?.name ?? "Select a template"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {selected?.description ?? ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
              title="Copy direct link to this template"
            >
              Copy Link
            </button>

            <button
              onClick={copyYaml}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              Copy YAML
            </button>

            <button
              onClick={openExternal}
              disabled={!normalizedGoUrl}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50"
              title={normalizedGoUrl ? normalizedGoUrl : "No link provided"}
            >
              Go
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={openEdit}
                  disabled={!selected}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={del}
                  disabled={!selected}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-[520px]">
            <code>{selected?.content ?? ""}</code>
          </pre>
        </div>
      </div>

      <TemplateEditorModal
        open={mode === "create" || mode === "edit"}
        mode={mode === "create" ? "create" : "edit"}
        draft={draft}
        setDraft={setDraft}
        onClose={closeModal}
        onSave={save}
      />
    </div>
  );
}