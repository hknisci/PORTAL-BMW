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

const JbossDetailContent: React.FC<PerformanceDetailProps> = ({ payload }) => {
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
        <DetailKpiCard title="CPU (%)" value={fmt(k.cpu)} />
        <DetailKpiCard title="Memory (%)" value={fmt(k.memory)} />
        <DetailKpiCard title="Latency (ms)" value={fmt(k.latencyMs)} />
        <DetailKpiCard title="Error Rate (%)" value={fmt(k.errorRate)} />
        <DetailKpiCard title="RPS" value={fmt(k.rps)} />
        <DetailKpiCard title="Active Conn." value={fmt(k.activeConnections)} />
        <DetailKpiCard title="Disk (%)" value={fmt(k.disk)} />
        <DetailKpiCard title="App Threads" value={fmt(k.threadCount ?? "-")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlaceholderDonutChart title="Heap / Metaspace" />
        <PlaceholderDonutChart title="Thread Pools" />
      </div>

      <PlaceholderChart title="Response Time Trend" />
      <PlaceholderTable title="Top Endpoints" headers={endpointHeaders} rows={endpointRows} />
      <PlaceholderTable title="Error Log Analizi" headers={errorLogHeaders} rows={errorLogRows} />
    </div>
  );
};

export default JbossDetailContent;