import { apiClient } from "@/src/lib/api-client";
import { CreateCreativeInput, UpdateCreativeInput } from "../schemas/creative.schema";
import { CreativeDTO } from "../types/creative.types";

export const creativeService = {
  async getCreatives(merchantId: string, campaignId: string): Promise<CreativeDTO[]> {
    return apiClient.get(`/api/umkm/advertising/campaigns/${campaignId}/creatives`, {
      headers: {
        "x-merchant-id": merchantId,
      },
    });
  },

  async createCreative(
    merchantId: string,
    campaignId: string,
    data: CreateCreativeInput
  ): Promise<CreativeDTO> {
    return apiClient.post(`/api/umkm/advertising/campaigns/${campaignId}/creatives`, data, {
      headers: {
        "x-merchant-id": merchantId,
      },
    });
  },

  async updateCreative(
    merchantId: string,
    campaignId: string,
    creativeId: string,
    data: UpdateCreativeInput
  ): Promise<CreativeDTO> {
    return apiClient.patch(`/api/umkm/advertising/campaigns/${campaignId}/creatives/${creativeId}`, data, {
      headers: {
        "x-merchant-id": merchantId,
      },
    });
  },

  async markReady(
    merchantId: string,
    campaignId: string,
    creativeId: string
  ): Promise<CreativeDTO> {
    return apiClient.post(`/api/umkm/advertising/campaigns/${campaignId}/creatives/${creativeId}/ready`, undefined, {
      headers: {
        "x-merchant-id": merchantId,
      },
    });
  },

  async uploadMedia(
    merchantId: string,
    campaignId: string,
    creativeId: string,
    file: File
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    
    // Note: since this is Next.js /api, we must use relative path or full URL.
    const res = await fetch(`/api/umkm/advertising/campaigns/${campaignId}/creatives/${creativeId}/media`, {
      method: "POST",
      headers: {
        "x-merchant-id": merchantId,
      },
      body: formData,
    });
    
    if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       throw new Error(err.error?.message || "Gagal mengunggah media");
    }
    const json = await res.json();
    return json.data;
  }
};
