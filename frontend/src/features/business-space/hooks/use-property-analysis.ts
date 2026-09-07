"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { businessSpaceService } from "../services/business-space.service";
import type { BusinessCategorySlug, BusinessSpaceCandidateDetail, BusinessSpaceComparison, BusinessSpaceInsight } from "../types/business-space.types";

type RequestState<T> = { key: string; data: T | null; error: string | null; loading: boolean };
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : "Data belum dapat dimuat. Silakan coba lagi.";

export function resetPropertyRequestContext<T>(state: RequestState<T>, key: string, loading = false): RequestState<T> {
  return state.key === key ? state : { key, data: null, error: null, loading };
}

function useRequestState<T>(key: string, loading = false) {
  const [state, setState] = useState<RequestState<T>>({ key, data: null, error: null, loading });
  const current = resetPropertyRequestContext(state, key, loading);
  // Store the intervening context too, so A -> B -> A cannot resurrect an aborted A request.
  // A guarded render update also hides the previous data before effects or a browser paint.
  if (current !== state) setState(current);
  return [current, setState] as const;
}

export function propertyDetailMatchesRequest(data: BusinessSpaceCandidateDetail, candidateId: string, category: BusinessCategorySlug) {
  return data.candidate.id === candidateId && data.market_context.category_slug === category;
}

export function propertyComparisonMatchesRequest(data: BusinessSpaceComparison, candidateIds: string[], category: BusinessCategorySlug, days: 7 | 30) {
  return data.category_slug === category && data.days === days
    && JSON.stringify(data.candidates.map((item) => item.candidate.id)) === JSON.stringify(candidateIds);
}

export function propertyInsightMatchesRequest(data: BusinessSpaceInsight, candidateIds: string[], category: BusinessCategorySlug, days: 7 | 30) {
  return data.evidence.category_slug === category && data.evidence.days === days
    && JSON.stringify(data.evidence.candidate_ids) === JSON.stringify(candidateIds);
}

export function usePropertyDetail(candidateId: string | null, category: BusinessCategorySlug, days: 7 | 30) {
  const key = JSON.stringify([candidateId, category, days]);
  const [state, setState] = useRequestState<BusinessSpaceCandidateDetail>(key, Boolean(candidateId));
  useEffect(() => {
    if (!candidateId) return;
    const controller = new AbortController();
    businessSpaceService.detail(candidateId, { category, days }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!propertyDetailMatchesRequest(data, candidateId, category)) throw new Error("Detail yang diterima tidak sesuai dengan properti terpilih. Silakan pilih ulang properti.");
        setState({ key, data, error: null, loading: false });
      })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setState({ key, data: null, error: errorMessage(cause), loading: false }); });
    return () => controller.abort();
  }, [candidateId, category, days, key, setState]);
  return { detail: state.data, error: state.error, loading: state.loading };
}

export function usePropertyComparison(candidateIds: string[], category: BusinessCategorySlug, days: 7 | 30) {
  const key = JSON.stringify([candidateIds, category, days]);
  const [comparison, setComparison] = useRequestState<BusinessSpaceComparison>(key);
  const [insight, setInsight] = useRequestState<BusinessSpaceInsight>(key);
  const compareController = useRef<AbortController | null>(null);
  const insightController = useRef<AbortController | null>(null);
  useEffect(() => () => { compareController.current?.abort(); insightController.current?.abort(); }, [key]);

  const runCompare = useCallback(async () => {
    if (candidateIds.length < 2) return;
    compareController.current?.abort();
    insightController.current?.abort();
    const controller = new AbortController();
    compareController.current = controller;
    setComparison({ key, data: null, error: null, loading: true });
    setInsight({ key, data: null, error: null, loading: false });
    try {
      const data = await businessSpaceService.compare(candidateIds, category, days, controller.signal);
      if (controller.signal.aborted) return;
      if (!propertyComparisonMatchesRequest(data, candidateIds, category, days)) throw new Error("Hasil perbandingan tidak sesuai dengan pilihan saat ini. Silakan bandingkan ulang.");
      setComparison({ key, data, error: null, loading: false });
    } catch (cause) {
      if (!controller.signal.aborted) setComparison({ key, data: null, error: errorMessage(cause), loading: false });
    }
  }, [candidateIds, category, days, key, setComparison, setInsight]);

  const askInsight = useCallback(async () => {
    if (comparison.key !== key || !comparison.data) return;
    insightController.current?.abort();
    const controller = new AbortController();
    insightController.current = controller;
    setInsight({ key, data: null, error: null, loading: true });
    try {
      const data = await businessSpaceService.insight(candidateIds, category, days, "Jelaskan perbedaan konteks lokasi properti ini dalam bahasa Indonesia berdasarkan data yang tersedia, beserta keterbatasan datanya.", controller.signal);
      if (controller.signal.aborted) return;
      if (!propertyInsightMatchesRequest(data, candidateIds, category, days)) throw new Error("Penjelasan tidak sesuai dengan data perbandingan saat ini. Silakan coba lagi.");
      setInsight({ key, data, error: null, loading: false });
    } catch (cause) {
      if (!controller.signal.aborted) setInsight({ key, data: null, error: errorMessage(cause), loading: false });
    }
  }, [candidateIds, category, days, key, comparison, setInsight]);

  return {
    comparison: comparison?.key === key ? comparison.data : null,
    compareLoading: comparison?.key === key && comparison.loading,
    compareError: comparison?.key === key ? comparison.error : null,
    insight: insight?.key === key ? insight.data : null,
    insightLoading: insight?.key === key && insight.loading,
    insightError: insight?.key === key ? insight.error : null,
    runCompare, askInsight,
  };
}
