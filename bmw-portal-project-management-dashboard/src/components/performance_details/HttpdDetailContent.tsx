// components/performance_details/HttpdDetailContent.tsx
import React from "react";
import DetailKpiCard from "./common/DetailKpiCard";
import PlaceholderTable from "../performance_tabs/common/PlaceholderTable";
import TimeSeriesChart from "./common/TimeSeriesChart";
import PlaceholderDonutChart from "../performance_tabs/common/PlaceholderDonutChart";
import { PerformanceDetailProps } from "@/api/performanceTypes";

const fmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("tr-TR") : "-";
  return String(v);
};

const HttpdDetailContent: React.FC<PerformanceDetailProps> = ({ payload }) => {
  const k = payload?.kpis || {};
  const endpoints = Array.isArray(payload?.topEndpoints) ? payload!.topEndpoints! : [];
  const logs = Array.isArray(payload?.errorLog) ? payload!.errorLog! : [];

  const endpointHeaders = ["Endpoint", "Requests", "Avg (ms)", "P95 (ms)", "Errors"];
  const endpointRows = endpoints.map((e) => [e.name, e.count, e.avgMs ?? "-", e.p95Ms ?? "-", e.errors ?? "-"]);

  const errorLogHeaders = ["Timestamp", "Level", "Message"];
  const errorLogRows = logs.map((l) => [l.ts, l.level, l.message]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DetailKpiCard title="Aktif Bağlantılar" value={fmt(k.activeConnections)} />
        <DetailKpiCard title="RPS" value={fmt(k.rps)} />
        <DetailKpiCard title="Latency (ms)" value={fmt(k.latencyMs)} />
        <DetailKpiCard title="Error Rate (%)" value={fmt(k.errorRate)} />
        <DetailKpiCard title="CPU (%)" value={fmt(k.cpu)} />
        <DetailKpiCard title="Memory (%)" value={fmt(k.memory)} />
        <DetailKpiCard title="Disk (%)" value={fmt(k.disk)} />
        <DetailKpiCard title="Product" value={payload?.product ? payload.product.toUpperCase() : "HTTPD"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlaceholderDonutChart title="Worker Kullanımı" />
        <PlaceholderDonutChart title="HTTP Durum Kodları" />
      </div>

      <TimeSeriesChart title="RPS Trend" points={payload?.timeseries?.rps} />
      <TimeSeriesChart title="Latency Trend (ms)" points={payload?.timeseries?.latencyMs} />
      <TimeSeriesChart title="Error Rate Trend (%)" points={payload?.timeseries?.errorRate} />

      <PlaceholderTable title="En Çok Kullanılan Endpoint’ler" headers={endpointHeaders} rows={endpointRows} />
      <PlaceholderTable title="Error Log Analizi" headers={errorLogHeaders} rows={errorLogRows} />
    </div>
  );
};

export default HttpdDetailContent;