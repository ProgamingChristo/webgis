import { SupabaseClient } from "@supabase/supabase-js";
import { UmkmWorkspaceSummary, OwnedMerchantBrief, SubmissionBrief } from "../types/umkm-workspace.types";

export class UmkmWorkspaceService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async getWorkspaceSummary(userId: string): Promise<UmkmWorkspaceSummary> {
    // Canonical ownership and approved claims are the only private-workspace grants.
    const { data: ownedMerchants, error: ownedError } = await this.supabase
      .from("merchants")
      .select("id, name, address, description, metadata, publish_status, verification_status")
      .eq("owner_id", userId);

    if (ownedError) {
      console.error("[UmkmWorkspaceService] Error fetching merchants:", ownedError);
      throw new Error("Gagal mengambil data merchant.");
    }

    const { data: approvedClaims, error: claimError } = await this.supabase
      .from("merchant_claims")
      .select("merchant_id")
      .eq("user_id", userId)
      .eq("status", "APPROVED");
    if (claimError) {
      console.error("[UmkmWorkspaceService] Error fetching approved claims:", claimError);
      throw new Error("Gagal memverifikasi akses merchant.");
    }

    const claimIds = [...new Set((approvedClaims ?? []).map((claim: any) => claim.merchant_id))];
    let claimedMerchants: any[] = [];
    if (claimIds.length > 0) {
      const { data, error } = await this.supabase
        .from("merchants")
        .select("id, name, address, description, metadata, publish_status, verification_status")
        .in("id", claimIds);
      if (error) throw new Error("Gagal mengambil merchant dengan klaim disetujui.");
      claimedMerchants = data ?? [];
    }

    const authorizedMerchants = [...new Map(
      [...(ownedMerchants ?? []), ...claimedMerchants].map((merchant: any) => [merchant.id, merchant]),
    ).values()];
    const merchantIds = authorizedMerchants.map((merchant: any) => merchant.id);

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

    const mappedOwnedMerchants: OwnedMerchantBrief[] = authorizedMerchants.map((m: any) => ({
      id: m.id,
      name: m.name,
      address: m.address || null,
      category: readCategory(m.metadata, m.description),
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

function readCategory(metadata: unknown, description: unknown) {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    const category = (metadata as Record<string, unknown>).category;
    if (typeof category === "string" && category.trim()) return category.trim();
  }
  return typeof description === "string" && description.trim()
    ? description.split("·")[0]!.trim()
    : "Kategori belum tersedia";
}
