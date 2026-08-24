import { apiClient } from "@/src/lib/api-client";
import {
  ContextualBannerDTO,
  ContextualBannerServingContext,
} from "../types/contextual-banner.types";

export const ContextualBannerService = {
  /**
   * Fetches an eligible contextual promo banner from the backend API.
   */
  async getContextualBanner(
    context: ContextualBannerServingContext
  ): Promise<ContextualBannerDTO | null> {
    const params = new URLSearchParams({
      longitude: context.longitude.toString(),
      latitude: context.latitude.toString(),
    });

    if (context.radiusMeters) params.set("radius_meters", context.radiusMeters.toString());
    if (context.category && context.category.toLowerCase() !== "semua") {
      params.set("category", context.category);
    }
    if (context.query) params.set("query", context.query);
    if (context.openNow !== undefined) params.set("open_now", context.openNow.toString());
    if (context.maxWalkingMinutes) {
      params.set("max_walking_minutes", context.maxWalkingMinutes.toString());
    }

    return apiClient.get<ContextualBannerDTO | null>(
      `/api/advertising/placements/contextual-banner?${params.toString()}`
    );
  },
};
