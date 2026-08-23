import { apiClient } from "@/src/lib/api-client";
import { Campaign, CreateCampaignInput, UpdateCampaignInput } from "../types/campaign.types";

export class CampaignService {
  static async getCampaigns(merchantId: string): Promise<Campaign[]> {
    return apiClient.get<Campaign[]>(
      `/api/umkm/advertising/campaigns?merchantId=${merchantId}`
    );
  }

  static async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    return apiClient.post<Campaign>(
      `/api/umkm/advertising/campaigns`,
      input
    );
  }

  static async updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    return apiClient.patch<Campaign>(
      `/api/umkm/advertising/campaigns/${id}`,
      input
    );
  }

  static async cancelCampaign(id: string): Promise<Campaign> {
    return apiClient.post<Campaign>(
      `/api/umkm/advertising/campaigns/${id}/cancel`
    );
  }
}
