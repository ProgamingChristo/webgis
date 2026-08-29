"use client";

import { useEffect, useMemo, useState } from "react";

import { administrativeBoundaryService } from "@/src/features/administrative-boundaries/services/administrative-boundary.service";
import type { AdministrativeBoundaryCollection } from "@/src/features/administrative-boundaries/types/administrative-boundary.types";

const EMPTY_BOUNDARIES: AdministrativeBoundaryCollection = {
  type: "FeatureCollection",
  features: [],
};

export function useAdministrativeBoundaries(regionIds: string[]) {
  const key = regionIds.join(",");
  const stableIds = useMemo(() => key ? key.split(",") : [], [key]);
  const [boundaries, setBoundaries] = useState(EMPTY_BOUNDARIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stableIds.length === 0) return;

    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setBoundaries(EMPTY_BOUNDARIES);
      setLoading(true);
      setError(null);
      try {
        setBoundaries(await administrativeBoundaryService.getByIds(stableIds, controller.signal));
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Boundary wilayah tidak dapat dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    });
    return () => controller.abort();
  }, [stableIds]);

  return stableIds.length === 0
    ? { boundaries: EMPTY_BOUNDARIES, loading: false, error: null }
    : { boundaries, loading, error };
}
