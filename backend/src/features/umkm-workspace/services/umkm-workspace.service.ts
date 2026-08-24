import { SupabaseClient } from "@supabase/supabase-js";
import { UmkmWorkspaceSummary, OwnedMerchantBrief, SubmissionBrief } from "../types/umkm-workspace.types";

export class UmkmWorkspaceService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async getWorkspaceSummary(userId: string): Promise<UmkmWorkspaceSummary> {
    // 1. Fetch Owned Merchants
    const { data: merchants, error: mError } = await this.supabase
      .from("merchants")
      .select("id, name, address, publish_status, verification_status")
      .eq("owner_id", userId);

    if (mError) {
      console.error("[UmkmWorkspaceService] Error fetching merchants:", mError);
      throw new Error("Gagal mengambil data merchant.");
    }

    const ownedMerchantsList = merchants || [];
    const merchantIds = ownedMerchantsList.map((m: any) => m.id);

    // 2. Fetch Active Campaigns Count
    let activeCampaignsCount = 0;
    const campaignCountByMerchant: Record<string, number> = {};

    if (merchantIds.length > 0) {
      const { data: campaigns, error: cError } = await this.supabase
        .from("ad_campaigns")
        .select("id, merchant_id, status")
        .in("merchant_id", merchantIds);

      if (!cError && campaigns) {
        for (const c of campaigns) {
          if (c.status === "ACTIVE") {
            activeCampaignsCount++;
          }
          campaignCountByMerchant[c.merchant_id] =
            (campaignCountByMerchant[c.merchant_id] || 0) + 1;
        }
      }
    }

    const mappedOwnedMerchants: OwnedMerchantBrief[] = ownedMerchantsList.map((m: any) => ({
      id: m.id,
      name: m.name,
      address: m.address || null,
      category: "UMKM",
      publish_status: m.publish_status,
      verification_status: m.verification_status,
      campaigns_count: campaignCountByMerchant[m.id] || 0,
    }));

    // 3. Fetch Recent Submissions (DRAFT, PENDING_REVIEW, REJECTED, APPROVED)
    const { data: submissions, error: sError } = await this.supabase
      .from("merchant_submissions")
      .select("id, name, category, status, address, created_at, updated_at")
      .eq("submitted_by", userId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (sError) {
      console.error("[UmkmWorkspaceService] Error fetching submissions:", sError);
    }

    const submissionsList = (submissions || []) as SubmissionBrief[];
    const pendingCount = submissionsList.filter(
      (s) => s.status === "PENDING_REVIEW" || s.status === "DRAFT"
    ).length;

    return {
      verified_merchants_count: mappedOwnedMerchants.length,
      pending_submissions_count: pendingCount,
      active_campaigns_count: activeCampaignsCount,
      owned_merchants: mappedOwnedMerchants,
      recent_submissions: submissionsList,
    };
  }
}
