import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import type {
  BusinessCategorySlug,
  BusinessSpaceCandidateDetail,
  BusinessSpaceCandidateList,
  BusinessSpaceComparison,
  BusinessSpaceInsight,
} from "../types/business-space.types";

interface CandidateQuery {
  category: BusinessCategorySlug;
  days: 7 | 30;
  region_id?: string;
  q?: string;
  property_category?: string;
  transaction_type?: "DIJUAL" | "DISEWA";
  bbox?: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  limit?: number;
  offset?: number;
}

async function readData<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error?.message || "Business Space API tidak tersedia.");
  }
  return json.data as T;
}

export const businessSpaceService = {
  async listCandidates(query: CandidateQuery, signal?: AbortSignal) {
    const params = new URLSearchParams({
      category: query.category,
      days: String(query.days),
      limit: String(query.limit ?? 12),
      offset: String(query.offset ?? 0),
    });
    if (query.region_id) params.set("region_id", query.region_id);
    if (query.q?.trim()) params.set("q", query.q.trim());
    if (query.property_category?.trim()) params.set("property_category", query.property_category.trim());
    if (query.transaction_type) params.set("transaction_type", query.transaction_type);
    if (query.bbox) {
      params.set("west", String(query.bbox.west));
      params.set("south", String(query.bbox.south));
      params.set("east", String(query.bbox.east));
      params.set("north", String(query.bbox.north));
    }
    return readData<BusinessSpaceCandidateList>(
      await authenticatedFetch(`${getGetraApiUrl("/api/business-space/candidates")}?${params}`, { signal }),
    );
  },

  async detail(candidateId: string, query: Pick<CandidateQuery, "category" | "days">, signal?: AbortSignal) {
    const params = new URLSearchParams({ category: query.category, days: String(query.days), region_id: "jakarta-selatan" });
    return readData<BusinessSpaceCandidateDetail>(
      await authenticatedFetch(`${getGetraApiUrl(`/api/business-space/candidates/${candidateId}`)}?${params}`, { signal }),
    );
  },

  async compare(candidateIds: string[], category: BusinessCategorySlug, days: 7 | 30) {
    return readData<BusinessSpaceComparison>(
      await authenticatedFetch(getGetraApiUrl("/api/business-space/compare"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_ids: candidateIds, category, days }),
      }),
    );
  },

  async insight(candidateIds: string[], category: BusinessCategorySlug, days: 7 | 30, question?: string) {
    return readData<BusinessSpaceInsight>(
      await authenticatedFetch(getGetraApiUrl("/api/business-space/insight"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_ids: candidateIds, category, days, question }),
      }),
    );
  },
};
