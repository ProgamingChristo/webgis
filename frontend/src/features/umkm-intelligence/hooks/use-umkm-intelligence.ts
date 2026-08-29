"use client";

import { useEffect, useRef, useState } from "react";
import { umkmIntelligenceService } from "../services/umkm-intelligence.service";
import type { UmkmIntelligenceResult } from "../types/umkm-intelligence.types";

export function useUmkmIntelligence(merchantId: string | null, days: 7 | 30) {
  const [data, setData] = useState<UmkmIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    if (!merchantId) return;
    const requestId = ++sequence.current;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError(null);
    }).then(() => umkmIntelligenceService.get(merchantId, days, controller.signal)).then((result) => {
      if (sequence.current === requestId) setData(result);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted && sequence.current === requestId) {
        setError(cause instanceof Error ? cause.message : "Intelligence merchant tidak dapat dimuat.");
      }
    }).finally(() => {
      if (sequence.current === requestId) setLoading(false);
    });
    return () => controller.abort();
  }, [days, merchantId]);

  return merchantId ? { data, loading, error } : { data: null, loading: false, error: null };
}
