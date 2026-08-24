import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { CampaignAnalyticsRepository } from "../repositories/campaign-analytics.repository";
import { CampaignAnalyticsDTO } from "../types/campaign-analytics.types";

export class CampaignAnalyticsService {
  private repo: CampaignAnalyticsRepository;

  constructor(private readonly supabase: SupabaseClient<any>) {
    this.repo = new CampaignAnalyticsRepository(supabase);
  }

  async getCampaignAnalytics(
    campaignId: string,
    userId: string,
    from?: string,
    to?: string,
    placement?: string
  ): Promise<CampaignAnalyticsDTO> {
    // 1. Fetch Campaign & Merchant Ownership
    const { data: campaign, error: cError } = await this.supabase
      .from("ad_campaigns")
      .select("id, name, status, merchant_id, created_by")
      .eq("id", campaignId)
      .single();

    if (cError || !campaign) {
      throw new ApplicationError("NOT_FOUND", "Campaign tidak ditemukan.");
    }

    // Verify user owns the merchant
    const { data: merchant, error: mError } = await this.supabase
      .from("merchants")
      .select("id, name, owner_id")
      .eq("id", campaign.merchant_id)
      .single();

    if (mError || !merchant) {
      throw new ApplicationError("NOT_FOUND", "Merchant tidak ditemukan.");
    }

    const isOwner = merchant.owner_id === userId;

    if (!isOwner) {
      // Check if admin
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("account_role")
        .eq("id", userId)
        .single();

      if (profile?.account_role !== "ADMIN") {
        throw new ApplicationError(
          "FORBIDDEN",
          "Anda tidak memiliki izin untuk melihat analitik campaign merchant ini."
        );
      }
    }

    // 2. Set default period if not supplied
    const effectiveTo = to || new Date().toISOString();
    const effectiveFrom =
      from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Aggregate Events
    const { summary, timeseries, placementBreakdown } =
      await this.repo.aggregateCampaignEvents(
        campaignId,
        effectiveFrom,
        effectiveTo,
        placement
      );

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        merchant_id: merchant.id,
        merchant_name: merchant.name,
      },
      period: {
        from: effectiveFrom,
        to: effectiveTo,
      },
      summary,
      timeseries,
      placement_breakdown: placementBreakdown,
    };
  }
}
