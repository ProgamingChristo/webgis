import { apiClient } from "@/src/lib/api-client";
import {
  CampaignLifecycleDTO,
  UpdateScheduleInput,
} from "../types/lifecycle.types";

export const LifecycleService = {
  async getLifecycleState(
    merchantId: string,
    campaignId: string
  ): Promise<CampaignLifecycleDTO> {
    return apiClient.get<CampaignLifecycleDTO>(
      `/api/umkm/advertising/campaigns/${campaignId}/lifecycle`,
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },

  async updateSchedule(
    merchantId: string,
    campaignId: string,
    input: UpdateScheduleInput
  ): Promise<CampaignLifecycleDTO> {
    return apiClient.put<CampaignLifecycleDTO>(
      `/api/umkm/advertising/campaigns/${campaignId}/schedule`,
      input,
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },

  async pauseCampaign(
    merchantId: string,
    campaignId: string
  ): Promise<CampaignLifecycleDTO> {
    return apiClient.post<CampaignLifecycleDTO>(
      `/api/umkm/advertising/campaigns/${campaignId}/pause`,
      {},
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },

  async resumeCampaign(
    merchantId: string,
    campaignId: string
  ): Promise<CampaignLifecycleDTO> {
    return apiClient.post<CampaignLifecycleDTO>(
      `/api/umkm/advertising/campaigns/${campaignId}/resume`,
      {},
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },

  async cancelCampaign(
    merchantId: string,
    campaignId: string
  ): Promise<CampaignLifecycleDTO> {
    return apiClient.post<CampaignLifecycleDTO>(
      `/api/umkm/advertising/campaigns/${campaignId}/cancel`,
      {},
      {
        headers: {
          "x-getra-merchant-id": merchantId,
        },
      }
    );
  },
};
