// src/api/performanceApi.ts

export type PerformanceSnapshot = {
  product: string;
  provider: string;
  updatedAt: string | null;
  data: any;
  lastError?: string | null;
};

async function json<T>(r: Response): Promise<T> {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ✅ backend eski/yeni response formatlarını tek formata çevirir
function normalizeSnapshotResponse(product: string, res: any): PerformanceSnapshot {
  // NEW format (ideal): { ok, product, provider, updatedAt, data, lastError }
  if (res && (res.provider || res.updatedAt || res.data) && !res.cache) {
    return {
      product,
      provider: res.provider || "mock",
      updatedAt: res.updatedAt ?? null,
      data: res.data ?? null,
      lastError: res.lastError ?? null,
    };
  }

  // OLD format: { ok, cache: { provider, updatedAt, data, lastError } }
  if (res?.cache) {
    const cache = res.cache;
    const picked = product
      ? (cache?.data ? cache.data[product] : null)
      : (cache?.data || null);

    return {
      product,
      provider: cache?.provider || "mock",
      updatedAt: cache?.updatedAt ?? null,
      data: picked,
      lastError: cache?.lastError ?? null,
    };
  }

  // fallback
  return {
    product,
    provider: "mock",
    updatedAt: null,
    data: null,
    lastError: null,
  };
}

export async function getPerformanceSnapshot(product: string): Promise<PerformanceSnapshot> {
  const r = await fetch(`/api/performance/snapshot?product=${encodeURIComponent(product)}`);
  const res: any = await json<any>(r);
  return normalizeSnapshotResponse(product, res);
}

export async function refreshPerformance(product: string): Promise<PerformanceSnapshot> {
  const r = await fetch(`/api/performance/refresh`, { method: "POST" });
  const res: any = await json<any>(r);

  // refresh endpoint bazen { ok, cache } döndürüyor olabilir → normalize
  return normalizeSnapshotResponse(product, res);
}

export async function refreshPerformanceAll(): Promise<void> {
  const r = await fetch(`/api/performance/refresh-all`, { method: "POST" });
  await json(r);
}

export async function getPerformanceConfig(): Promise<any> {
  const r = await fetch(`/api/performance/config`);
  return await json(r);
}

export async function updatePerformanceConfig(payload: any): Promise<any> {
  const r = await fetch(`/api/performance/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await json(r);
}