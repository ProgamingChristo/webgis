"use client";

import { useEffect, useMemo, useState } from "react";

import { contextualLayerService } from "@/src/features/mission-context-layers/services/contextual-layer.service";
import type {
  ContextualLayerData,
  ContextualLayerVisibility,
  ContextualObservationCollection,
  ContextualSource,
  ContextualSourceState,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";
import type { MapViewportBounds } from "@/src/services/mapid-layer.service";

const EMPTY_COLLECTION: ContextualObservationCollection = {
  type: "FeatureCollection",
  features: [],
};

const EMPTY_STATE: ContextualSourceState = {
  collection: EMPTY_COLLECTION,
  error: null,
  loading: false,
  totalAvailable: 0,
};

function bboxKey(bbox: MapViewportBounds | null): string {
  return bbox
    ? [bbox.west, bbox.south, bbox.east, bbox.north]
      .map((value) => value.toFixed(5)).join(",")
    : "";
}

function parseBbox(key: string): MapViewportBounds | null {
  if (!key) return null;
  const [west, south, east, north] = key.split(",").map(Number);
  return { west, south, east, north };
}

function useContextualSource(
  source: ContextualSource,
  enabled: boolean,
  viewportKey: string,
  errorMessage: string,
): ContextualSourceState {
  const [state, setState] = useState<ContextualSourceState>(EMPTY_STATE);

  useEffect(() => {
    const bbox = parseBbox(viewportKey);
    if (!enabled || !bbox) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setState((current) => ({ ...current, error: null, loading: true }));
      void contextualLayerService.getViewport(source, bbox, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setState({
            collection: result.feature_collection,
            error: null,
            loading: false,
            totalAvailable: result.total_available,
          });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            collection: EMPTY_COLLECTION,
            error: error instanceof Error ? errorMessage : errorMessage,
            loading: false,
            totalAvailable: 0,
          });
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled, errorMessage, source, viewportKey]);

  return enabled && viewportKey ? state : EMPTY_STATE;
}

export function useContextualLayers(
  bbox: MapViewportBounds | null,
  visibility: ContextualLayerVisibility,
): ContextualLayerData {
  const key = useMemo(() => bboxKey(bbox), [bbox]);
  return {
    PROPERTI_GO: useContextualSource(
      "PROPERTI_GO",
      visibility.property,
      key,
      "Properti tidak dapat dimuat.",
    ),
    STRUK_GO: useContextualSource(
      "STRUK_GO",
      visibility.transaction,
      key,
      "Observasi transaksi tidak dapat dimuat.",
    ),
    ACTIVITIES: useContextualSource(
      "ACTIVITIES",
      visibility.activities,
      key,
      "Observasi lapangan tidak dapat dimuat.",
    ),
  };
}
