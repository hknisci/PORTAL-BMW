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

const HttpdTabContent: React.FC<Props> = ({ onWidgetClick }) => {
  const snap = usePerformanceSnapshot("httpd", { intervalSeconds: 30, enabled: true });
  const k = snap.data?.kpis || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="CPU (%)" value={fmt(k.cpu)} onClick={() => onWidgetClick("CPU (%)")} />
        <KpiCard title="Memory (%)" value={fmt(k.memory)} onClick={() => onWidgetClick("Memory (%)")} />
        <KpiCard title="Disk (%)" value={fmt(k.disk)} onClick={() => onWidgetClick("Disk (%)")} />
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

export default HttpdTabContent;