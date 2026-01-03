import React from "react";
import PlaceholderDonutChart from "./common/PlaceholderDonutChart";
import KpiCard from "./common/KpiCard";
import { usePerformanceSnapshot } from "@/hooks/usePerformanceSnapshot";

interface Props {
  onWidgetClick: (widgetTitle: string) => void;
}

const fmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("tr-TR") : "-";
  return String(v);
};

const HazelcastTabContent: React.FC<Props> = ({ onWidgetClick }) => {
  const snap = usePerformanceSnapshot("hazelcast", { intervalSeconds: 30, enabled: true });
  const k = snap.data?.kpis || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PlaceholderDonutChart title="Heap & Non-Heap Memory" onClick={() => onWidgetClick("Heap & Non-Heap Memory")} />
      <PlaceholderDonutChart title="Cluster Üyeleri Durumu" onClick={() => onWidgetClick("Cluster Üyeleri Durumu")} />
      <KpiCard title="Active Conn." value={fmt(k.activeConnections)} unit="Active" onClick={() => onWidgetClick("Active Connections")} />
    </div>
  );
};

export default HazelcastTabContent;