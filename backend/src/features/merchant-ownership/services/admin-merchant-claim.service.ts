import type { SupabaseClient } from "@supabase/supabase-js";

import { ApplicationError } from "@/src/lib/errors";
import type { AdminMerchantClaimRecord } from "../types/merchant-ownership.types";

export class AdminMerchantClaimService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async list(limit = 50, offset = 0): Promise<AdminMerchantClaimRecord[]> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);

    const { data: claims, error } = await this.supabase
      .from("merchant_claims")
      .select("id, merchant_id, user_id, status, note, evidence, created_at, reviewed_at")
      .in("status", ["PENDING", "REJECTED"])
      .order("created_at", { ascending: false })
      .range(normalizedOffset, normalizedOffset + normalizedLimit - 1);

    if (error) {
      throw new ApplicationError("DATABASE_ERROR", "Gagal mengambil daftar klaim merchant.");
    }

    return this.mapClaims(claims ?? []);
  }

  async approve(
    claimId: string,
    adminId: string,
    note?: string,
  ): Promise<AdminMerchantClaimRecord> {
    const { error } = await this.supabase.rpc("approve_merchant_claim", {
      claim_id: claimId,
      review_note: note?.trim() || undefined,
    });

    if (error) {
      throw new ApplicationError("DATABASE_ERROR", "Gagal menyetujui klaim merchant.");
    }
    const updated = await this.findClaim(claimId);
    if (updated.reviewed_by !== adminId) {
      throw new ApplicationError("DATABASE_ERROR", "Identitas reviewer klaim tidak konsisten.");
    }
    return (await this.mapClaims([updated]))[0]!;
  }

  async reject(
    claimId: string,
    adminId: string,
    note: string,
  ): Promise<AdminMerchantClaimRecord> {
    const { error } = await this.supabase.rpc("reject_merchant_claim", {
      claim_id: claimId,
      review_note: note.trim(),
    });

    if (error) {
      throw new ApplicationError("DATABASE_ERROR", "Gagal menolak klaim merchant.");
    }
    const updated = await this.findClaim(claimId);
    if (updated.reviewed_by !== adminId) {
      throw new ApplicationError("DATABASE_ERROR", "Identitas reviewer klaim tidak konsisten.");
    }
    return (await this.mapClaims([updated]))[0]!;
  }

  private async findClaim(claimId: string) {
    const { data, error } = await this.supabase
      .from("merchant_claims")
      .select("id, merchant_id, user_id, status, note, evidence, created_at, reviewed_at, reviewed_by")
      .eq("id", claimId)
      .single();

    if (error || !data) {
      throw new ApplicationError("NOT_FOUND", "Klaim merchant tidak ditemukan.");
    }

    return data;
  }

  private async mapClaims(claims: any[]): Promise<AdminMerchantClaimRecord[]> {
    const merchantIds = [...new Set(claims.map((claim) => claim.merchant_id).filter(Boolean))];
    const userIds = [...new Set(claims.map((claim) => claim.user_id).filter(Boolean))];

    const [merchantResult, profileResult, approvedClaimResult] = await Promise.all([
      merchantIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : this.supabase
            .from("merchants")
            .select("id, name, address, description, metadata, publish_status, verification_status")
            .in("id", merchantIds),
      userIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : this.supabase
            .from("profiles")
            .select("id, display_name, username")
            .in("id", userIds),
      merchantIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : this.supabase
            .from("merchant_claims")
            .select("merchant_id, user_id")
            .in("merchant_id", merchantIds)
            .eq("status", "APPROVED"),
    ]);

    if (merchantResult.error || profileResult.error || approvedClaimResult.error) {
      throw new ApplicationError("DATABASE_ERROR", "Gagal mengambil konteks klaim merchant.");
    }

    const merchantById = new Map((merchantResult.data ?? []).map((merchant: any) => [merchant.id, merchant]));
    const profileById = new Map((profileResult.data ?? []).map((profile: any) => [profile.id, profile]));
    const approvedClaimsByMerchant = new Map<string, Set<string>>();
    for (const approvedClaim of approvedClaimResult.data ?? []) {
      const owners = approvedClaimsByMerchant.get(approvedClaim.merchant_id) ?? new Set<string>();
      owners.add(approvedClaim.user_id);
      approvedClaimsByMerchant.set(approvedClaim.merchant_id, owners);
    }

    return claims.map((claim) => {
      const merchant = merchantById.get(claim.merchant_id);
      const profile = profileById.get(claim.user_id);
      const approvedOwners = approvedClaimsByMerchant.get(claim.merchant_id);

      return {
        id: claim.id,
        merchant_id: claim.merchant_id,
        merchant_name: merchant?.name ?? "Merchant tidak ditemukan",
        merchant_category: readCategory(merchant?.metadata, merchant?.description),
        merchant_address: merchant?.address ?? null,
        merchant_publish_status: merchant?.publish_status ?? null,
        merchant_verification_status: merchant?.verification_status ?? null,
        has_ownership_conflict: approvedOwners ? !approvedOwners.has(claim.user_id) : false,
        submitted_by: claim.user_id,
        submitted_by_name: profile?.display_name || profile?.username || "User GETRA",
        submitted_by_username: profile?.username ?? null,
        status: claim.status,
        note: claim.note ?? null,
        evidence: readClaimEvidence(claim.evidence),
        created_at: claim.created_at,
        reviewed_at: claim.reviewed_at ?? null,
      };
    });
  }
}

function readClaimEvidence(value: unknown): AdminMerchantClaimRecord["evidence"] {
  const evidence = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const read = (key: string) => typeof evidence[key] === "string" ? evidence[key] as string : null;
  return {
    contact_name: read("contactName"),
    contact_phone: read("contactPhone"),
    relationship: read("relationship"),
    statement: read("statement"),
  };
}

function readCategory(metadata: unknown, description: unknown) {
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    const category = (metadata as Record<string, unknown>).category;
    if (typeof category === "string" && category.trim()) return category.trim();
  }

  return typeof description === "string" && description.trim()
    ? description.split("/")[0]!.trim()
    : "Kategori belum tersedia";
}
