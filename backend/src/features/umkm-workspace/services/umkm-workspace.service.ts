import { SupabaseClient } from "@supabase/supabase-js";
import { parseSubmissionPoint } from "@/src/features/merchant-submission/repositories/submission-point";
import {
  ArchiveOwnedMerchantResult,
  MerchantClaimBrief,
  OwnedMerchantBrief,
  SubmissionBrief,
  UmkmWorkspaceSummary,
} from "../types/umkm-workspace.types";

export class UmkmWorkspaceService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async getWorkspaceSummary(userId: string): Promise<UmkmWorkspaceSummary> {
    // Canonical owner_id is active authority. Claims are workflow/audit history only.
    const ownedMerchants: any[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await this.supabase
        .from("merchants")
        .select("id, name, address, description, metadata, publish_status, verification_status")
        .eq("owner_id", userId)
        .eq("publish_status", "PUBLISHED")
        .order("id")
        .range(offset, offset + 99);
      if (error) throw new Error("Gagal mengambil data usaha.");
      ownedMerchants.push(...(data ?? []));
      if (!data || data.length < 100) break;
    }

    // Keep every open workflow: a newer closed record must not hide pending work.
    const allClaims = await this.readWorkflowRows("merchant_claims", "id, merchant_id, status, note, created_at, reviewed_at", "user_id", userId, "created_at");
    const recentClaims = retainOpenAndRecent(allClaims, ["PENDING"]);

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
    const activeCampaignCountByMerchant: Record<string, number> = {};

    if (merchantIds.length > 0) {
      // Page campaigns too: an API row cap must not become a displayed total.
      for (let offset = 0; ; offset += 100) {
        const { data: campaigns, error } = await this.supabase.from("ad_campaigns")
          .select("id, merchant_id, status").in("merchant_id", merchantIds)
          .order("id").range(offset, offset + 99);
        if (error) throw new Error("Gagal mengambil status promosi usaha.");
        for (const c of campaigns ?? []) {
          if (c.status === "ACTIVE") {
            activeCampaignsCount++;
            activeCampaignCountByMerchant[c.merchant_id] = (activeCampaignCountByMerchant[c.merchant_id] || 0) + 1;
          }
          campaignCountByMerchant[c.merchant_id] =
            (campaignCountByMerchant[c.merchant_id] || 0) + 1;
        }
        if (!campaigns || campaigns.length < 100) break;
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
      active_campaigns_count: activeCampaignCountByMerchant[m.id] || 0,
    }));

    // 3. Fetch Recent Submissions (DRAFT, PENDING_REVIEW, REJECTED, APPROVED)
    const submissions = await this.readWorkflowRows("merchant_submissions", "id, name, category, status, address, location, created_at, updated_at", "submitted_by", userId, "updated_at");
    const submissionsList: SubmissionBrief[] = (retainOpenAndRecent(submissions, ["DRAFT", "PENDING_REVIEW"]) as any[]).map((s) => {
      let parsedLocation: { type: "Point"; coordinates: [number, number] } | null = null;
      if (s.location) {
        try {
          parsedLocation = parseSubmissionPoint(s.location);
        } catch {
          parsedLocation = null;
        }
      }
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        status: s.status,
        address: s.address ?? null,
        location: parsedLocation,
        created_at: s.created_at,
        updated_at: s.updated_at,
      };
    });
    const claimsList: MerchantClaimBrief[] = (recentClaims || []).map((claim: any) => {
      const merchant = merchantByClaimId.get(claim.merchant_id);
      return {
        id: claim.id,
        merchant_id: claim.merchant_id,
        merchant_name: merchant?.name ?? "Usaha tidak ditemukan",
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

  private async readWorkflowRows(table: "merchant_claims" | "merchant_submissions", columns: string, ownerColumn: string, userId: string, dateColumn: string) {
    const rows: any[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await this.supabase.from(table).select(columns).eq(ownerColumn, userId)
        .order(dateColumn, { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw new Error(table === "merchant_claims" ? "Gagal mengambil status klaim usaha." : "Gagal mengambil status pendaftaran usaha.");
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) return rows;
    }
  }

  async archiveOwnedMerchant(merchantId: string): Promise<ArchiveOwnedMerchantResult> {
    const { data, error } = await this.supabase.rpc("archive_owned_merchant", {
      p_merchant_id: merchantId,
    });

    if (error) {
      console.error("[UmkmWorkspaceService] Error archiving merchant:", error);
      throw new Error("Gagal menghapus usaha dari publikasi GETRA.");
    }

    if (!isArchiveOwnedMerchantResult(data)) {
      throw new Error("Respons penghapusan usaha tidak valid.");
    }

    return data;
  }
}

function retainOpenAndRecent(rows: any[], openStatuses: string[]) {
  let historyCount = 0;
  return rows.filter((row) => openStatuses.includes(row.status) || historyCount++ < 10);
}

function isArchiveOwnedMerchantResult(value: unknown): value is ArchiveOwnedMerchantResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.merchant_id === "string" &&
    typeof result.blocking_campaigns_count === "number" &&
    ["ARCHIVED", "ALREADY_ARCHIVED", "ACTIVE_CAMPAIGNS", "FORBIDDEN", "NOT_FOUND"].includes(
      String(result.status),
    )
  );
}

function readCategory(metadata: unknown, description: unknown) {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    const fields = metadata as Record<string, unknown>;
    for (const category of [fields.category, fields.category_label]) {
      if (typeof category === "string" && category.trim()) return category.trim();
    }
  }
  return typeof description === "string" && description.trim()
    ? description.split("·")[0]!.trim()
    : "Kategori belum tersedia";
}
