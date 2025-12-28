import React from "react";
import DetailKpiCard from "./common/DetailKpiCard";
import PlaceholderTable from "../performance_tabs/common/PlaceholderTable";
import PlaceholderChart from "../performance_tabs/common/PlaceholderChart";
import PlaceholderDonutChart from "../performance_tabs/common/PlaceholderDonutChart";
import { PerformanceDetailProps } from "../../src/api/performanceTypes";

const fmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString("tr-TR") : "-";
  return String(v);
};

const CtgDetailContent: React.FC<PerformanceDetailProps> = ({ payload }) => {
  const k = payload?.kpis || {};
  const endpoints = Array.isArray(payload?.topEndpoints) ? payload!.topEndpoints! : [];
  const logs = Array.isArray(payload?.errorLog) ? payload!.errorLog! : [];

  const endpointHeaders = ["Transaction", "Count", "Avg (ms)", "P95 (ms)", "Errors"];
  const endpointRows = endpoints.map((e) => [e.name, e.count, e.avgMs ?? "-", e.p95Ms ?? "-", e.errors ?? "-"]);

  const errorLogHeaders = ["Timestamp", "Level", "Message"];
  const errorLogRows = logs.map((l) => [l.ts, l.level, l.message]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DetailKpiCard title="RPS" value={fmt(k.rps)} />
        <DetailKpiCard title="Latency (ms)" value={fmt(k.latencyMs)} />
        <DetailKpiCard title="Error Rate (%)" value={fmt(k.errorRate)} />
        <DetailKpiCard title="Active Sessions" value={fmt(k.activeConnections)} />
        <DetailKpiCard title="CPU (%)" value={fmt(k.cpu)} />
        <DetailKpiCard title="Memory (%)" value={fmt(k.memory)} />
        <DetailKpiCard title="Disk (%)" value={fmt(k.disk)} />
        <DetailKpiCard title="Queue Depth" value={fmt(k.queueDepth ?? "-")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlaceholderDonutChart title="Transaction Types" />
        <PlaceholderDonutChart title="Return Codes" />
      </div>

      <PlaceholderChart title="Transactions / Errors Trend" />
      <PlaceholderTable title="Top Transactions" headers={endpointHeaders} rows={endpointRows} />
      <PlaceholderTable title="Error Log Analizi" headers={errorLogHeaders} rows={errorLogRows} />
    </div>
  );
};

export default CtgDetailContent;