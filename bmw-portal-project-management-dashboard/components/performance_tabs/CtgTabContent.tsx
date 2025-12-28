import React from "react";
import KpiCard from "./common/KpiCard";
import { usePerformanceSnapshot } from "../../src/hooks/usePerformanceSnapshot";

interface Props {
  onWidgetClick: (widgetTitle: string) => void;
}

const fmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("tr-TR") : "-";
  return String(v);
};

const CtgTabContent: React.FC<Props> = ({ onWidgetClick }) => {
  const snap = usePerformanceSnapshot("ctg", { intervalSeconds: 30, enabled: true });
  const k = snap.data?.kpis || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <KpiCard title="RPS" value={fmt(k.rps)} onClick={() => onWidgetClick("RPS")} />
      <KpiCard title="Latency (ms)" value={fmt(k.latencyMs)} onClick={() => onWidgetClick("Latency")} />
      <KpiCard title="Error Rate (%)" value={fmt(k.errorRate)} onClick={() => onWidgetClick("Error Rate")} />
      <KpiCard title="CPU (%)" value={fmt(k.cpu)} onClick={() => onWidgetClick("CPU")} />
      <KpiCard title="Memory (%)" value={fmt(k.memory)} onClick={() => onWidgetClick("Memory")} />
      <KpiCard title="Active Sessions" value={fmt(k.activeConnections)} onClick={() => onWidgetClick("Active Sessions")} />
    </div>
  );
};

export default CtgTabContent;