import { apiClient } from "@/src/lib/api-client";
import type {
  AdministrativeBoundaryCollection,
  AdministrativeBoundaryFeature,
} from "@/src/features/administrative-boundaries/types/administrative-boundary.types";

interface BoundaryApiResult {
  feature_collection: AdministrativeBoundaryCollection;
  feature_count: number;
}

const featureCache = new Map<string, AdministrativeBoundaryFeature>();

export const administrativeBoundaryService = {
  async getByIds(
    ids: string[],
    signal?: AbortSignal,
  ): Promise<AdministrativeBoundaryCollection> {
    const uniqueIds = [...new Set(ids)];
    const missingIds = uniqueIds.filter((id) => !featureCache.has(id));
    if (missingIds.length > 0) {
      const result = await apiClient.get<BoundaryApiResult>(
        `/api/regions?ids=${encodeURIComponent(missingIds.join(","))}`,
        { signal },
      );
      for (const feature of result.feature_collection.features) {
        featureCache.set(feature.properties.id, feature);
      }
    }

    return {
      type: "FeatureCollection",
      features: uniqueIds.map((id) => featureCache.get(id)).filter(
        (feature): feature is AdministrativeBoundaryFeature => Boolean(feature),
      ),
    };
  },
};
