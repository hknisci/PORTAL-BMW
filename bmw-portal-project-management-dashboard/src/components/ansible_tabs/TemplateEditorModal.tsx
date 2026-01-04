// src/components/ansible_tabs/TemplateEditorModal.tsx
import React, { useMemo } from "react";
import type { AnsibleTemplate } from "@/types";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  draft: AnsibleTemplate;
  setDraft: React.Dispatch<React.SetStateAction<AnsibleTemplate>>;
  onClose: () => void;
  onSave: () => void;
  title?: string;
};

export default function TemplateEditorModal({
  open,
  mode,
  draft,
  setDraft,
  onClose,
  onSave,
  title,
}: Props) {
  const header = useMemo(() => {
    if (title) return title;
    return mode === "create" ? "New Template" : `Edit: ${draft.name || ""}`;
  }, [mode, draft.name, title]);

  if (!open) return null;

  const setTagString = (v: string) => {
    const tags = v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    setDraft((d) => ({ ...d, tags }));
  };

  const linkValue = (draft.linkUrl || draft.goUrl || "").trim();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <p className="font-semibold text-gray-900 truncate">{header}</p>
            <p className="text-xs text-gray-600 mt-1">
              {mode === "create"
                ? "Create a new template and save."
                : "Update fields and save changes."}
            </p>
          </div>

          {/* Body (scroll) */}
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Name</label>
                <input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Owner</label>
                <input
                  value={draft.owner ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, owner: e.target.value }))
                  }
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Description</label>
              <input
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Purpose</label>
              <input
                value={draft.purpose ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, purpose: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Notes</label>
              <input
                value={draft.notes ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, notes: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Survey Info</label>
              <input
                value={draft.surveyInfo ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, surveyInfo: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">
                Tags (comma separated)
              </label>
              <input
                value={(draft.tags ?? []).join(", ")}
                onChange={(e) => setTagString(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Link URL (optional)</label>
              <input
                value={linkValue}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    linkUrl: e.target.value,
                    goUrl: e.target.value, // ✅ mirror
                  }))
                }
                placeholder="confluence/... or git-scm.com or https://tower/..."
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">YAML Content</label>
              <textarea
                value={draft.content}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, content: e.target.value }))
                }
                className="mt-1 w-full h-[260px] px-3 py-2 font-mono text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}