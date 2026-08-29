"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { demandIntelligenceService } from "../services/demand-intelligence.service";
import type { AnalyticsQuery, DemandIntelligenceResult } from "../types/demand-intelligence.types";

export function useDemandIntelligence(enabled: boolean, query: AnalyticsQuery) {
  const [data, setData] = useState<DemandIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const queryKey = JSON.stringify(query);
  const stableQuery = useMemo(() => JSON.parse(queryKey) as AnalyticsQuery, [queryKey]);

  useEffect(() => {
    if (!enabled) return;
    const requestId = ++sequence.current;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted || sequence.current !== requestId) return;
      setLoading(true);
      setError(null);
    }).then(() => demandIntelligenceService.get(stableQuery, controller.signal)).then((result) => {
      if (sequence.current === requestId) setData(result);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted && sequence.current === requestId) {
        setError(cause instanceof Error ? cause.message : "Analytics GETRA tidak dapat dimuat.");
      }
    }).finally(() => {
      if (sequence.current === requestId) setLoading(false);
    });
    return () => controller.abort();
  }, [enabled, stableQuery]);

  return enabled ? { data, loading, error } : { data: null, loading: false, error: null };
}
