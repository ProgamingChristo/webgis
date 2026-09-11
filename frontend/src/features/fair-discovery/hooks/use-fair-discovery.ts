import { useState, useEffect, useCallback } from "react";
import { FairDiscoveryService } from "../services/fair-discovery.service";
import type { DiscoveryQuery, FairDiscoveryResult } from "../types/fair-discovery.types";

interface UseFairDiscoveryProps { query: DiscoveryQuery | null; enabled?: boolean }
type Snapshot = { key: string; result: FairDiscoveryResult | null; error: string | null };

export function useFairDiscovery({ query, enabled = true }: UseFairDiscoveryProps) {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const key = JSON.stringify([enabled, query, attempt]);
  useEffect(() => {
    if (!enabled || !query) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void FairDiscoveryService.discover(query, { signal: controller.signal }).then((result) => {
        if (!controller.signal.aborted) setSnapshot({ key, result, error: null });
      }).catch(() => {
        if (!controller.signal.aborted) setSnapshot({ key, result: null, error: "Tempat belum dapat dimuat. Coba lagi." });
      });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [enabled, query, key]);
  const current = snapshot?.key === key ? snapshot : null;
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);
  return { result: enabled ? current?.result ?? null : null,
    isLoading: Boolean(enabled && query && !current), error: current?.error ?? null, refetch };
}
