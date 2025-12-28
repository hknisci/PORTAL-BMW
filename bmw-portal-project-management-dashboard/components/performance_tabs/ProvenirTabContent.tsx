import React from "react";
import PlaceholderChart from "./common/PlaceholderChart";
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

const ProvenirTabContent: React.FC<Props> = ({ onWidgetClick }) => {
  const snap = usePerformanceSnapshot("provenir", { intervalSeconds: 30, enabled: true });
  const k = snap.data?.kpis || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PlaceholderChart title="Transaction Volume" onClick={() => onWidgetClick("Transaction Volume")} />
      <KpiCard title="Latency (ms)" value={fmt(k.latencyMs)} unit="ms" onClick={() => onWidgetClick("Latency")} />
      <KpiCard title="Error Rate (%)" value={fmt(k.errorRate)} unit="%" onClick={() => onWidgetClick("Error Rate")} />
    </div>
  );
};

export default ProvenirTabContent;