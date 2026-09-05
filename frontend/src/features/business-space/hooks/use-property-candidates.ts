"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { businessSpaceService, type CandidateQuery } from "../services/business-space.service";
import type { BusinessSpaceViewport } from "../types/business-space.types";
import { createPropertyCandidateLoader } from "../utils/property-candidate-loader";
import { isPropertyViewportTooWide, normalizePropertyViewport, propertyViewportKey } from "../utils/property-viewport";

type PropertyFilters = Pick<CandidateQuery, "category" | "days" | "q" | "property_category" | "transaction_type">;

export function usePropertyCandidates({ category, days, q, property_category, transaction_type }: PropertyFilters) {
  const [viewport, setViewport] = useState<BusinessSpaceViewport | null>(null);
  const [loader] = useState(() => createPropertyCandidateLoader(businessSpaceService.listCandidates));
  const state = useSyncExternalStore(loader.subscribe, loader.getSnapshot, loader.getSnapshot);
  const viewportTooWide = viewport !== null && isPropertyViewportTooWide(viewport);

  const onViewportChange = useCallback((bounds: BusinessSpaceViewport) => {
    const next = normalizePropertyViewport(bounds);
    setViewport((current) => propertyViewportKey(current) === propertyViewportKey(next) ? current : next);
  }, []);

  useEffect(() => {
    loader.setQuery(viewport && !viewportTooWide
      ? { category, days, q, property_category, transaction_type, bbox: viewport }
      : null);
    return loader.cancel;
  }, [loader, viewport, viewportTooWide, category, days, q, property_category, transaction_type]);

  return {
    ...state, viewport, viewportTooWide, onViewportChange,
    refresh: loader.refresh, loadMore: loader.loadMore,
  };
}
