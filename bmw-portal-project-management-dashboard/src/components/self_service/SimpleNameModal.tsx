// src/components/self_service/SimpleNameModal.tsx
import React, { useEffect, useState } from "react";

export default function SimpleNameModal({
  open,
  title,
  initialValue,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [v, setV] = useState("");

  useEffect(() => {
    setV(initialValue || "");
  }, [initialValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-600 mt-1">Name is required.</p>
          </div>

          <div className="p-4">
            <label className="text-xs text-gray-600">Name</label>
            <input
              value={v}
              onChange={(e) => setV(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(v.trim())}
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