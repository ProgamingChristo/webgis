"use client";

import { useEffect, useRef, useState } from "react";
import { umkmIntelligenceService } from "../services/umkm-intelligence.service";
import type { UmkmIntelligenceResult } from "../types/umkm-intelligence.types";

export function useUmkmIntelligence(merchantId: string | null, days: 7 | 30, refreshToken?: unknown): {
  data: UmkmIntelligenceResult | null;
  loading: boolean;
  error: string | null;
} {
  const [result, setResult] = useState<{
    key: string;
    refreshToken: unknown;
    data: UmkmIntelligenceResult | null;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const sequence = useRef(0);
  const key = `${merchantId}:${days}`;

  useEffect(() => {
    const requestId = ++sequence.current;
    if (!merchantId) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted || sequence.current !== requestId) return;
      setResult({ key, refreshToken, data: null, loading: true, error: null });
      try {
        const data = await umkmIntelligenceService.get(merchantId, days, controller.signal);
        if (controller.signal.aborted || sequence.current !== requestId) return;
        if (data.merchant.id !== merchantId) throw new Error("Data usaha tidak sesuai. Silakan muat ulang.");
        setResult({ key, refreshToken, data, loading: false, error: null });
      } catch (cause: unknown) {
        if (!controller.signal.aborted && sequence.current === requestId) {
          setResult({ key, refreshToken, data: null, loading: false, error: cause instanceof Error ? cause.message : "Data usaha tidak dapat dimuat." });
        }
      }
    });
    return () => controller.abort();
  }, [days, key, merchantId, refreshToken]);

  if (!merchantId) return { data: null, loading: false, error: null };
  // Hide the previous merchant/window synchronously, before the next effect runs.
  return result?.key === key && result.refreshToken === refreshToken ? result : { data: null, loading: true, error: null };
}
