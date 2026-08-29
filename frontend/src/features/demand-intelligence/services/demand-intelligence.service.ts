import { apiClient } from "@/src/lib/api-client";
import type {
  AnalyticsInterpretation,
  AnalyticsQuery,
  DemandIntelligenceResult,
} from "../types/demand-intelligence.types";

export function buildAnalyticsQuery(query: AnalyticsQuery) {
  const params = new URLSearchParams({
    category: query.category,
    days: String(query.days),
    limit: "5",
  });
  if (query.region_ids.length) {
    params.set("region_ids", query.region_ids.join(","));
  } else if (query.bbox) {
    params.set("west", String(query.bbox.west));
    params.set("south", String(query.bbox.south));
    params.set("east", String(query.bbox.east));
    params.set("north", String(query.bbox.north));
  }
  return params.toString();
}

export const demandIntelligenceService = {
  get(query: AnalyticsQuery, signal?: AbortSignal) {
    const endpoint = query.mode === "DEMAND" ? "demand" : "retail-gap";
    return apiClient.get<DemandIntelligenceResult>(
      `/api/analytics/${endpoint}?${buildAnalyticsQuery(query)}`,
      { signal },
    );
  },

  interpret(query: AnalyticsQuery, regionId: string, signal?: AbortSignal) {
    return apiClient.post<AnalyticsInterpretation>(
      "/api/analytics/interpretation",
      { query: buildAnalyticsQuery(query), region_id: regionId },
      { signal },
    );
  },
};
