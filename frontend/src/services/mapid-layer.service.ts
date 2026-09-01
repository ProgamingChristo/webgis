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
}

export interface CanonicalMerchantSearchOptions {
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
    return apiClient.get<CanonicalMerchantLayer>(
      `/api/merchants/canonical?${params.toString()}`,
      { signal: options.signal },
    );
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
