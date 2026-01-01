import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Point = { t: string; v: number };

export default function TimeSeriesChart({
  title,
  points,
}: {
  title: string;
  points?: Point[];
}) {
  const data = useMemo(() => {
    if (!Array.isArray(points)) return [];
    return points.map((p) => ({
      time: p.t,
      value: typeof p.v === "number" ? p.v : null,
    }));
  }, [points]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm h-72 flex flex-col">
      <h4 className="text-sm text-gray-500 font-medium mb-4">{title}</h4>

      {data.length ? (
        <div className="flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(v) => String(v).slice(11, 16)} // HH:MM
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
                labelFormatter={(v) => String(v)}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          No time-series data (yet)
        </div>
      )}
    </div>
  );
}