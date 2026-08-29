import { apiClient } from "@/src/lib/api-client";
import type { MapViewportBounds } from "@/src/services/mapid-layer.service";
import type {
  ContextualObservationResult,
  ContextualSource,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";

const viewportCache = new Map<string, ContextualObservationResult>();
const MAX_CACHE_ENTRIES = 30;

function cacheKey(source: ContextualSource, bbox: MapViewportBounds): string {
  return [source, bbox.west, bbox.south, bbox.east, bbox.north]
    .map((value) => typeof value === "number" ? value.toFixed(5) : value)
    .join(":");
}

export const contextualLayerService = {
  getViewport(
    source: ContextualSource,
    bbox: MapViewportBounds,
    signal?: AbortSignal,
  ): Promise<ContextualObservationResult> {
    const key = cacheKey(source, bbox);
    const cached = viewportCache.get(key);
    if (cached) return Promise.resolve(cached);
    const params = new URLSearchParams({
      source,
      west: String(bbox.west),
      south: String(bbox.south),
      east: String(bbox.east),
      north: String(bbox.north),
      limit: "250",
      offset: "0",
    });
    return apiClient.get<ContextualObservationResult>(
      `/api/contextual-observations?${params.toString()}`,
      { signal },
    ).then((result) => {
      viewportCache.set(key, result);
      if (viewportCache.size > MAX_CACHE_ENTRIES) {
        const oldest = viewportCache.keys().next().value;
        if (oldest) viewportCache.delete(oldest);
      }
      return result;
    });
  },
};

export function clearContextualLayerCacheForTests(): void {
  viewportCache.clear();
}
