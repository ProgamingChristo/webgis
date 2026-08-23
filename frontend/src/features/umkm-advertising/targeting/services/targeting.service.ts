import { apiClient } from "@/src/lib/api-client";
import { CampaignTarget, SaveTargetingInput, StudyAreaSummary } from "../types/targeting.types";

export const TargetingService = {
  async getCampaignTarget(merchantId: string, campaignId: string): Promise<CampaignTarget> {
    return apiClient.get<CampaignTarget>(
      `/api/umkm/advertising/campaigns/${campaignId}/targeting`,
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },

  async saveCampaignTarget(
    merchantId: string,
    campaignId: string,
    input: SaveTargetingInput
  ): Promise<CampaignTarget> {
    return apiClient.put<CampaignTarget>(
      `/api/umkm/advertising/campaigns/${campaignId}/targeting`,
      input,
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },

  async getStudyAreas(): Promise<StudyAreaSummary[]> {
    try {
      const areas = await apiClient.get<StudyAreaSummary[]>(
        "/api/v1/study-areas"
      );
      return Array.isArray(areas) ? areas : [];
    } catch (err) {
      console.warn("Failed to fetch study areas:", err);
      return [];
    }
  },
};
