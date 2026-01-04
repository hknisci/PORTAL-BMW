// src/components/self_service/SelfServiceItemModal.tsx
import React, { useMemo, useState } from "react";
import type { SelfServiceItem } from "@/types";

export default function SelfServiceItemModal({
  open,
  mode,
  draft,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  draft: SelfServiceItem;
  onClose: () => void;
  onSave: (draft: SelfServiceItem) => void;
}) {
  const [d, setD] = useState<SelfServiceItem>(draft);

  React.useEffect(() => {
    setD(draft);
  }, [draft]);

  const header = useMemo(() => {
    return mode === "create" ? "New Item" : `Edit: ${draft.title || ""}`;
  }, [mode, draft.title]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <p className="font-semibold text-gray-900 truncate">{header}</p>
            <p className="text-xs text-gray-600 mt-1">
              Required: Go URL, Request Example, Sample
            </p>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto">
            <div>
              <label className="text-xs text-gray-600">Title</label>
              <input
                value={d.title}
                onChange={(e) => setD((x) => ({ ...x, title: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Info (optional)</label>
              <textarea
                value={d.info || ""}
                onChange={(e) => setD((x) => ({ ...x, info: e.target.value }))}
                className="mt-1 w-full h-[90px] px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Go URL (required)</label>
              <input
                value={d.goUrl}
                onChange={(e) => setD((x) => ({ ...x, goUrl: e.target.value }))}
                placeholder="confluence/... or https://..."
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Request Example (required)</label>
              <textarea
                value={d.requestExample}
                onChange={(e) => setD((x) => ({ ...x, requestExample: e.target.value }))}
                className="mt-1 w-full h-[160px] px-3 py-2 font-mono text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Details (optional)</label>
              <textarea
                value={d.details || ""}
                onChange={(e) => setD((x) => ({ ...x, details: e.target.value }))}
                className="mt-1 w-full h-[120px] px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600">Sample Type</label>
                <select
                  value={d.sample.type}
                  onChange={(e) =>
                    setD((x) => ({ ...x, sample: { ...x.sample, type: e.target.value as any } }))
                  }
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="link">link</option>
                  <option value="text">text</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">
                  Sample Value (required)
                </label>
                <input
                  value={d.sample.value}
                  onChange={(e) =>
                    setD((x) => ({ ...x, sample: { ...x.sample, value: e.target.value } }))
                  }
                  placeholder={d.sample.type === "link" ? "https://..." : "sample text"}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Extra (optional)</label>
              <textarea
                value={d.extra || ""}
                onChange={(e) => setD((x) => ({ ...x, extra: e.target.value }))}
                className="mt-1 w-full h-[90px] px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(d)}
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