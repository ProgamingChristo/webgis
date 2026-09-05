"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { umkmIntelligenceService } from "../services/umkm-intelligence.service";
import type { UmkmCopilotResult } from "../types/umkm-intelligence.types";

export function useUmkmInsightExplanation(merchantId: string, days: 7 | 30, refreshToken?: unknown) {
  const key = `${merchantId}:${days}`;
  const request = useRef<{ controller: AbortController; key: string } | null>(null);
  const [state, setState] = useState<{
    key: string;
    refreshToken: unknown;
    data: UmkmCopilotResult | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  useEffect(() => () => request.current?.controller.abort(), [key, refreshToken]);

  const explain = useCallback(async () => {
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { controller, key };
    setState({ key, refreshToken, data: null, loading: true, error: null });
    try {
      const data = await umkmIntelligenceService.ask(
        merchantId,
        days,
        "Jelaskan data pasar, kebutuhan yang tercatat, dan usaha sejenis di wilayah usaha saya. Apa artinya untuk usaha saya dan hal apa yang dapat diuji berdasarkan data GETRA? Jelaskan juga batas datanya dengan bahasa Indonesia sederhana.",
        controller.signal,
      );
      if (controller.signal.aborted || request.current?.controller !== controller) return;
      if (data.evidence.merchant_id !== merchantId) throw new Error("Penjelasan tidak sesuai dengan usaha yang dipilih. Coba lagi.");
      setState({ key, refreshToken, data, loading: false, error: null });
    } catch (cause: unknown) {
      if (!controller.signal.aborted && request.current?.controller === controller) {
        setState({ key, refreshToken, data: null, loading: false, error: cause instanceof Error ? cause.message : "Penjelasan belum tersedia. Coba lagi." });
      }
    }
  }, [days, key, merchantId, refreshToken]);

  return { ...(state?.key === key && state.refreshToken === refreshToken ? state : { data: null, loading: false, error: null }), explain };
}
