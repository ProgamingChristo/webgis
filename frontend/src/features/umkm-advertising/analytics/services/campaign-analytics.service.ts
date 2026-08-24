import { apiClient } from "@/src/lib/api-client";
import { CampaignAnalyticsDTO } from "../types/campaign-analytics.types";

export class CampaignAnalyticsService {
  static async getCampaignAnalytics(
    campaignId: string,
    params?: { from?: string; to?: string; placement?: string }
  ): Promise<CampaignAnalyticsDTO> {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.append("from", params.from);
    if (params?.to) searchParams.append("to", params.to);
    if (params?.placement) searchParams.append("placement", params.placement);

    const qs = searchParams.toString();
    const url = `/api/umkm/advertising/campaigns/${campaignId}/analytics${qs ? `?${qs}` : ""}`;

    return apiClient.get<CampaignAnalyticsDTO>(url);
  }
}
