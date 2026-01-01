import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DonutItem = { name: string; value: number };

const COLORS = [
  "#2563eb", "#16a34a", "#f97316", "#dc2626",
  "#7c3aed", "#0891b2", "#64748b", "#0f172a",
];

export default function DonutChart({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items?: DonutItem[];
  emptyMessage?: string;
}) {
  const data = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items
      .map((x) => ({
        name: String(x?.name || "").trim(),
        value: Number(x?.value ?? 0),
      }))
      .filter((x) => x.name && Number.isFinite(x.value) && x.value > 0);
  }, [items]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm h-72 flex flex-col">
      <h4 className="text-sm text-gray-500 font-medium mb-4">{title}</h4>

      {data.length ? (
        <div className="flex-grow flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          {emptyMessage || "No breakdown data"}
        </div>
      )}
    </div>
  );
}