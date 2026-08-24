import { useState, useEffect, useCallback } from "react";
import { FairDiscoveryService } from "../services/fair-discovery.service";
import { DiscoveryQuery, FairDiscoveryResult } from "../types/fair-discovery.types";

interface UseFairDiscoveryProps {
  query: DiscoveryQuery | null;
  enabled?: boolean;
}

export function useFairDiscovery({ query, enabled = true }: UseFairDiscoveryProps) {
  const [result, setResult] = useState<FairDiscoveryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscovery = useCallback(async () => {
    if (!enabled || !query || !query.origin) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await FairDiscoveryService.discover(query);
      setResult(data);
    } catch (err: any) {
      console.error("[useFairDiscovery] Discovery fetch failed:", err);
      setError(err?.message || "Gagal memuat hasil penelusuran GETRA.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, query]);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void fetchDiscovery();
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [fetchDiscovery]);

  return {
    result,
    isLoading,
    error,
    refetch: fetchDiscovery,
  };
}
