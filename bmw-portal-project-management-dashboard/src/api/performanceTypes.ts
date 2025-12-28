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

export type PerformancePayload = {
  product: string;
  kpis?: Record<string, any>;
  topEndpoints?: EndpointRow[];
  errorLog?: ErrorLogRow[];
};

export type PerformanceDetailProps = {
  payload?: PerformancePayload | null;
};