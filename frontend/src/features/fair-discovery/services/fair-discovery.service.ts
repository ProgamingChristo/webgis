import { apiClient } from "@/src/lib/api-client";
import { DiscoveryQuery, FairDiscoveryResult } from "../types/fair-discovery.types";

export const FairDiscoveryService = {
  /**
   * Dispatches discovery request to backend canonical fair discovery endpoint.
   */
  async discover(query: DiscoveryQuery): Promise<FairDiscoveryResult> {
    const params = new URLSearchParams({
      longitude: query.origin.longitude.toString(),
      latitude: query.origin.latitude.toString(),
    });

    if (query.radiusMeters) params.set("radius_meters", query.radiusMeters.toString());
    if (query.category && query.category.toLowerCase() !== "semua") params.set("category", query.category);
    if (query.query) params.set("query", query.query);
    if (query.openNow !== undefined) params.set("open_now", query.openNow.toString());
    if (query.maxWalkingMinutes) params.set("max_walking_minutes", query.maxWalkingMinutes.toString());
    if (query.limit) params.set("limit", query.limit.toString());

    return apiClient.get<FairDiscoveryResult>(`/api/discovery?${params.toString()}`);
  },
};
