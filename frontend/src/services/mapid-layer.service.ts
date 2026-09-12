import { apiClient } from "@/src/lib/api-client";
import type { Merchant } from "@/types/getra";

export interface MapidFoodBeverageLayer {
  layer_id: string;
  layer_name: string;
  source: string;
  city: string;
  collected_at: string;
  total_features: number;
  merchants: Merchant[];
}

export interface MapViewportBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface CanonicalMerchantLayer {
  layer_id: string;
  layer_name: string;
  source: string;
  total_features: number;
  total_available: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  bbox: MapViewportBounds;
  merchants: Merchant[];
  intent: GlobalSearchIntent;
  regions: SearchRegion[];
  available_regions: SearchRegion[];
  commuter: CommuterSearchMetadata;
}

export interface CommuterSearchMetadata {
  candidate_count: number;
  constrained_count: number;
  excluded: Record<string, number>;
  hard_constraints_applied: string[];
  constraints_relaxed: boolean;
}

export type GlobalSearchScope =
  | "GLOBAL"
  | "CURRENT_VIEWPORT"
  | "REGION"
  | "MULTI_REGION";

export interface SearchRegion {
  id: string;
  name: string;
  aliases: string[];
  bounds: MapViewportBounds;
  geometry_source: string;
}

export interface GlobalSearchIntent {
  reference?: { id?: string; label: string; longitude: number; latitude: number; type: "USER_LOCATION" | "TRANSIT" | "SELECTED_POINT" } | null;
  radius_meters?: number;
  sort?: "RELEVANCE" | "NEAREST" | "PRICE_ASC";
  recommendation?: boolean;
  candidate_limited?: boolean;
  domain: "MERCHANT";
  original_query: string;
  keyword: string | null;
  location_text: string | null;
  category: string | null;
  scope: {
    type: GlobalSearchScope;
    region_ids: string[];
    bounds: MapViewportBounds;
  };
  constraints: {
    budget: { max_idr: number } | null;
    opening: { open_now: true; timezone: "Asia/Jakarta" } | null;
    walking: { max_minutes: number } | null;
  };
  origin: {
    longitude: number;
    latitude: number;
    source: "USER_LOCATION" | "SELECTED_POINT" | "EXPLICIT_ORIGIN";
  } | null;
  parser: "DETERMINISTIC";
  confidence: "HIGH" | "MEDIUM";
  query_resolution?: {
    normalized: string;
    canonical: string;
    correction: string | null;
    confidence: "EXACT" | "ALIAS" | "HIGH_FUZZY" | "NONE";
  };
}

export interface CanonicalMerchantSearchOptions {
  referenceText?: string;
  radiusMeters?: number;
  sort?: "RELEVANCE" | "NEAREST" | "PRICE_ASC";
  recommendation?: boolean;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
  query?: string;
  category?: string;
  scope?: GlobalSearchScope;
  regionIds?: string[];
  locationText?: string;
  maxBudget?: number;
  openNow?: boolean;
  maxWalkingMinutes?: number;
  origin?: {
    longitude: number;
    latitude: number;
    source: "USER_LOCATION" | "SELECTED_POINT" | "EXPLICIT_ORIGIN";
  };
}

interface ResolvedPlaceCandidate {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

const EXPLICIT_PLACE_QUERY = /^(?:perumahan|komplek|kompleks|cluster|apartemen|apartment|gedung|jalan|jl\.?|mall|plaza|pasar|sekolah|kampus|universitas)\b/i;

function placeBounds(place: ResolvedPlaceCandidate, radiusMeters = 1000): MapViewportBounds {
  const latitudeDelta = radiusMeters / 111_320;
  const longitudeScale = Math.max(Math.cos((place.latitude * Math.PI) / 180), 0.2);
  const longitudeDelta = radiusMeters / (111_320 * longitudeScale);
  return {
    west: place.longitude - longitudeDelta,
    south: place.latitude - latitudeDelta,
    east: place.longitude + longitudeDelta,
    north: place.latitude + latitudeDelta,
  };
}

async function resolveExplicitPlaceFallback(
  layer: CanonicalMerchantLayer,
  options: CanonicalMerchantSearchOptions,
): Promise<CanonicalMerchantLayer> {
  const query = options.query?.trim() ?? "";
  if (
    layer.merchants.length > 0 ||
    !EXPLICIT_PLACE_QUERY.test(query) ||
    options.regionIds?.length ||
    options.referenceText ||
    options.maxBudget ||
    options.openNow ||
    options.maxWalkingMinutes
  ) {
    return layer;
  }

  try {
    const resolved = await apiClient.get<{
      candidates: ResolvedPlaceCandidate[];
      query: string;
      source: string;
    }>(`/api/places/resolve?q=${encodeURIComponent(query)}`, { signal: options.signal });
    if (resolved.candidates.length !== 1) return layer;

    const place = resolved.candidates[0];
    const bounds = placeBounds(place);
    return {
      ...layer,
      bbox: bounds,
      intent: {
        ...layer.intent,
        keyword: null,
        location_text: place.label,
        reference: {
          id: place.id,
          label: place.label,
          longitude: place.longitude,
          latitude: place.latitude,
          type: "SELECTED_POINT",
        },
        radius_meters: 1000,
        origin: {
          longitude: place.longitude,
          latitude: place.latitude,
          source: "SELECTED_POINT",
        },
        scope: {
          type: "CURRENT_VIEWPORT",
          region_ids: [],
          bounds,
        },
      },
    };
  } catch {
    return layer;
  }
}

export const mapidLayerService = {
  async getFoodBeverageLayer(): Promise<MapidFoodBeverageLayer> {
    return apiClient.get<MapidFoodBeverageLayer>(
      "/api/mapid/food-beverage",
    );
  },

  async getCanonicalMerchants(
    bbox: MapViewportBounds,
    options: CanonicalMerchantSearchOptions = {},
  ): Promise<CanonicalMerchantLayer> {
    const params = new URLSearchParams({
      west: String(bbox.west),
      south: String(bbox.south),
      east: String(bbox.east),
      north: String(bbox.north),
      limit: String(options.limit ?? 250),
      offset: String(options.offset ?? 0),
      q: options.query?.trim() ?? "",
      scope: options.scope ?? "CURRENT_VIEWPORT",
    });
    if (options.referenceText) params.set("reference_text", options.referenceText);
    if (options.radiusMeters) params.set("radius_meters", String(options.radiusMeters));
    if (options.sort) params.set("sort", options.sort);
    if (options.recommendation) params.set("recommendation", "true");
    if (options.category?.trim()) params.set("category", options.category.trim());
    if (options.regionIds?.length) params.set("region_ids", options.regionIds.join(","));
    if (options.locationText?.trim()) params.set("location_text", options.locationText.trim());
    if (options.maxBudget) params.set("max_budget", String(options.maxBudget));
    if (options.openNow) params.set("open_now", "true");
    if (options.maxWalkingMinutes) params.set("max_walking_minutes", String(options.maxWalkingMinutes));
    if (options.origin) {
      params.set("origin_longitude", String(options.origin.longitude));
      params.set("origin_latitude", String(options.origin.latitude));
      params.set("origin_source", options.origin.source);
    }
    const layer = await apiClient.get<CanonicalMerchantLayer>(
      `/api/merchants/canonical?${params.toString()}`,
      { signal: options.signal },
    );
    return resolveExplicitPlaceFallback(layer, options);
  },

  async searchCanonicalMerchants(
    query: string,
    options: Pick<CanonicalMerchantSearchOptions, "limit" | "offset" | "signal"> = {},
  ): Promise<CanonicalMerchantLayer> {
    const params = new URLSearchParams({
      q: query.trim(),
      scope: "GLOBAL",
      limit: String(options.limit ?? 10),
      offset: String(options.offset ?? 0),
    });
    return apiClient.get<CanonicalMerchantLayer>(
      `/api/merchants/canonical?${params.toString()}`,
      { signal: options.signal },
    );
  },
};
