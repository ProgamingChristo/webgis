import { apiClient } from "@/src/lib/api-client";
import {
  ServingPreviewResult,
  SponsoredPinDTO,
  SponsoredPinServingContext,
} from "../types/ad-serving.types";

export const AdServingService = {
  /**
   * Public candidates query for sponsored pin placements at a given spatial context.
   */
  async getSponsoredPinCandidates(
    longitude: number,
    latitude: number,
    limit = 5
  ): Promise<SponsoredPinDTO[]> {
    const params = new URLSearchParams({
      longitude: longitude.toString(),
      latitude: latitude.toString(),
      limit: limit.toString(),
    });

    return apiClient.get<SponsoredPinDTO[]>(
      `/api/advertising/placements/sponsored-pins?${params.toString()}`
    );
  },

  /**
   * Owner-facing evaluation endpoint that analyzes why a single campaign
   * is or is not servable at a test context location.
   */
  async evaluateCampaignServing(
    merchantId: string,
    campaignId: string,
    context: SponsoredPinServingContext
  ): Promise<ServingPreviewResult> {
    return apiClient.post<ServingPreviewResult>(
      `/api/umkm/advertising/campaigns/${campaignId}/serving-preview`,
      context,
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },
};
