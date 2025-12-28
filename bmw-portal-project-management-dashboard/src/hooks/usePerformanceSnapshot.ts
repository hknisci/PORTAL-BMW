// src/hooks/usePerformanceSnapshot.ts
import { useEffect, useRef, useState } from "react";
import { getPerformanceSnapshot } from "../api/performanceApi";

type SnapshotState = {
  loading: boolean;
  error: string | null;
  provider: string | null;
  updatedAt: string | null;
  data: any | null;
  lastError: string | null;
};

export function usePerformanceSnapshot(
  product: string | null,
  opts?: { intervalSeconds?: number; enabled?: boolean }
) {
  const intervalSeconds = Math.max(5, Number(opts?.intervalSeconds ?? 30));
  const enabled = opts?.enabled ?? true;

  const [state, setState] = useState<SnapshotState>({
    loading: false,
    error: null,
    provider: null,
    updatedAt: null,
    data: null,
    lastError: null,
  });

  const timerRef = useRef<any>(null);

  async function loadOnce() {
    if (!product) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res: any = await getPerformanceSnapshot(product);
      setState({
        loading: false,
        error: null,
        provider: res?.provider ?? null,
        updatedAt: res?.updatedAt ?? null,
        data: res?.data ?? null,
        lastError: res?.lastError ?? null,
      });
    } catch (e: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e?.message || "Snapshot alınamadı",
      }));
    }
  }

  useEffect(() => {
    if (!enabled) return;
    if (!product) return;

    // first load
    loadOnce();

    // polling
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      loadOnce().catch(() => {});
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, intervalSeconds, enabled]);

  return {
    ...state,
    reload: loadOnce,
  };
}