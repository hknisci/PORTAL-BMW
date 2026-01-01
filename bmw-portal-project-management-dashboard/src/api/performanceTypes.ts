// src/api/performanceTypes.ts

export type EndpointRow = {
  name: string;
  count: number;
  avgMs?: number;
  p95Ms?: number;
  errors?: number;
};

export type ErrorLogRow = {
  ts: string;
  level: string;
  message: string;
};

export type TimePoint = {
  t: string; // ISO timestamp
  v: number; // numeric value
};

export type PerformanceTimeseries = {
  rps?: TimePoint[];
  latencyMs?: TimePoint[];
  errorRate?: TimePoint[];
};

export type PerformancePayload = {
  product: string;
  kpis?: Record<string, any>;
  timeseries?: PerformanceTimeseries; // ✅ UI bunu kullanıyor
  topEndpoints?: EndpointRow[];
  errorLog?: ErrorLogRow[];
  scope?: any; // provider debug/scope alanı (dynatrace/splunk zaten dönüyor)
};

export type PerformanceDetailProps = {
  payload?: PerformancePayload | null;
};