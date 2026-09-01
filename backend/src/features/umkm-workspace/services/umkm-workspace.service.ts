import { SupabaseClient } from "@supabase/supabase-js";
import {
  MerchantClaimBrief,
  OwnedMerchantBrief,
  SubmissionBrief,
  UmkmWorkspaceSummary,
} from "../types/umkm-workspace.types";

export class UmkmWorkspaceService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async getWorkspaceSummary(userId: string): Promise<UmkmWorkspaceSummary> {
    // Canonical owner_id is active authority. Claims are workflow/audit history only.
    const { data: ownedMerchants, error: ownedError } = await this.supabase
      .from("merchants")
      .select("id, name, address, description, metadata, publish_status, verification_status")
      .eq("owner_id", userId);

    if (ownedError) {
      console.error("[UmkmWorkspaceService] Error fetching merchants:", ownedError);
      throw new Error("Gagal mengambil data merchant.");
    }

    const { data: recentClaims, error: recentClaimsError } = await this.supabase
      .from("merchant_claims")
      .select("id, merchant_id, status, note, created_at, reviewed_at")
      .eq("user_id", userId)
      .in("status", ["PENDING", "REJECTED"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentClaimsError) {
      console.error("[UmkmWorkspaceService] Error fetching merchant claims:", recentClaimsError);
    }

    const visibleClaimMerchantIds = [...new Set((recentClaims ?? []).map((claim: any) => claim.merchant_id))];
    const allClaimMerchantIds = visibleClaimMerchantIds;
    let claimMerchants: any[] = [];
    if (allClaimMerchantIds.length > 0) {
      const { data, error } = await this.supabase
        .from("merchants")
        .select("id, name, address, description, metadata, publish_status, verification_status")
        .in("id", allClaimMerchantIds);
      if (error) throw new Error("Gagal mengambil merchant dari klaim ownership.");
      claimMerchants = data ?? [];
    }

    const merchantByClaimId = new Map(
      claimMerchants.map((merchant: any) => [merchant.id, merchant]),
    );
    const authorizedMerchants = ownedMerchants ?? [];
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
    const claimsList: MerchantClaimBrief[] = (recentClaims || []).map((claim: any) => {
      const merchant = merchantByClaimId.get(claim.merchant_id);
      return {
        id: claim.id,
        merchant_id: claim.merchant_id,
        merchant_name: merchant?.name ?? "Merchant tidak ditemukan",
        category: readCategory(merchant?.metadata, merchant?.description),
        status: claim.status,
        address: merchant?.address ?? null,
        note: claim.note ?? null,
        created_at: claim.created_at,
        reviewed_at: claim.reviewed_at ?? null,
      };
    });
    const pendingCount = submissionsList.filter(
      (s) => s.status === "PENDING_REVIEW" || s.status === "DRAFT"
    ).length + claimsList.filter((claim) => claim.status === "PENDING").length;

    return {
      verified_merchants_count: mappedOwnedMerchants.length,
      pending_submissions_count: pendingCount,
      active_campaigns_count: activeCampaignsCount,
      owned_merchants: mappedOwnedMerchants,
      recent_submissions: submissionsList,
      recent_claims: claimsList,
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
