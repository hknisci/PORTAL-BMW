import React from "react";
import PlaceholderChart from "./common/PlaceholderChart";
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

const WebsphereTabContent: React.FC<Props> = ({ onWidgetClick }) => {
  const snap = usePerformanceSnapshot("websphere", { intervalSeconds: 30, enabled: true });
  const k = snap.data?.kpis || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="CPU (%)" value={fmt(k.cpu)} onClick={() => onWidgetClick("CPU")} />
        <KpiCard title="Memory (%)" value={fmt(k.memory)} onClick={() => onWidgetClick("Memory")} />
        <KpiCard title="RPS" value={fmt(k.rps)} onClick={() => onWidgetClick("RPS")} />
        <KpiCard title="Latency (ms)" value={fmt(k.latencyMs)} onClick={() => onWidgetClick("Latency")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PlaceholderDonutChart title="CPU & Bellek" onClick={() => onWidgetClick("CPU & Bellek")} />
        <PlaceholderDonutChart title="Thread & JDBC Bağlantıları" onClick={() => onWidgetClick("Thread & JDBC Bağlantıları")} />
        <PlaceholderChart title="HTTP İstekleri ve Hata Oranları" onClick={() => onWidgetClick("HTTP İstekleri ve Hata Oranları")} />
      </div>
    </div>
  );
};

export default WebsphereTabContent;