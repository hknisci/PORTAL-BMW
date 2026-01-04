import React from "react";

type Props = {
  allTags: string[];
  value: string;              // selected tag (single)
  onChange: (v: string) => void;
};

export default function TagFilter({ allTags, value, onChange }: Props) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="text-xs text-gray-600 whitespace-nowrap">Tag Filter</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">All</option>
        {allTags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}