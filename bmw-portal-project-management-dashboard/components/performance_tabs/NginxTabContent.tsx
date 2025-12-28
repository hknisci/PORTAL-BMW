import React from "react";
import PlaceholderChart from "./common/PlaceholderChart";
import PlaceholderDonutChart from "./common/PlaceholderDonutChart";
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

const NginxTabContent: React.FC<Props> = ({ onWidgetClick }) => {
  const snap = usePerformanceSnapshot("nginx", { intervalSeconds: 30, enabled: true });
  const k = snap.data?.kpis || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="RPS" value={fmt(k.rps)} onClick={() => onWidgetClick("RPS")} />
        <KpiCard title="Latency (ms)" value={fmt(k.latencyMs)} onClick={() => onWidgetClick("Latency")} />
        <KpiCard title="Error Rate (%)" value={fmt(k.errorRate)} onClick={() => onWidgetClick("Error Rate")} />
        <KpiCard title="Active Conn." value={fmt(k.activeConnections)} onClick={() => onWidgetClick("Active Connections")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PlaceholderDonutChart title="CPU / Bellek / Disk Kullanımı" onClick={() => onWidgetClick("CPU / Bellek / Disk Kullanımı")} />
        <PlaceholderChart title="Toplam İstek & Hata Oranları" onClick={() => onWidgetClick("Toplam İstek & Hata Oranları")} />
        <PlaceholderChart title="Ortalama Yanıt Süresi" onClick={() => onWidgetClick("Ortalama Yanıt Süresi")} />
      </div>
    </div>
  );
};

export default NginxTabContent;