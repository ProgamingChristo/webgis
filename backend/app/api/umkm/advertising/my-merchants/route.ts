import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { AdvertisingEligibilityService } from "@/src/features/umkm-advertising";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    // 1. Read every owned canonical merchant; ownership remains the canonical authority.
    const owned = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, name, address, publish_status, verification_status, location, metadata, description, primary_category_id")
        .eq("owner_id", userId)
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return NextResponse.json(
          { success: false, error: { message: error.message } },
          { status: 500 }
        );
      }
      owned.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }

    const ownedMerchantIds = new Set(owned.map((m) => m.id));

    // 2. Fetch pending submissions for this user (Status: Menunggu verifikasi, campaign disabled)
    let pendingSubmissions: any[] = [];
    try {
      const subQuery = supabase
        .from("merchant_submissions")
        .select("id, name, address, status, canonical_merchant_id, created_at, updated_at")
        .eq("submitted_by", userId)
        .eq("status", "PENDING_REVIEW");

      const subRes = typeof (subQuery as any).range === "function"
        ? await (subQuery as any).order("created_at", { ascending: false }).range(0, 99)
        : await subQuery;

      if (subRes && Array.isArray(subRes.data)) {
        pendingSubmissions = subRes.data.filter(
          (item: any) =>
            item &&
            item.status === "PENDING_REVIEW" &&
            (!item.canonical_merchant_id || !ownedMerchantIds.has(item.canonical_merchant_id))
        );
      }
    } catch {
      pendingSubmissions = [];
    }

    const pendingSubmissionItems = pendingSubmissions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      address: sub.address || null,
      publish_status: "PENDING_REVIEW",
      verification_status: "PENDING",
      relationshipState: "SUBMISSION_PENDING" as const,
      statusLabel: "Menunggu verifikasi",
      canCreateCampaign: false,
      reason: "SUBMISSION_PENDING",
      detailMessage: "Verifikasi diperlukan sebelum promosi dapat dibuat.",
      actionLabel: "Lihat Status",
      actionHref: "/umkm#pengajuan",
      isOwnedByMe: false,
    }));

    // 3. Fetch pending claims for this user (Status: Claim sedang diperiksa, campaign disabled)
    let pendingClaims: any[] = [];
    try {
      const claimQuery = supabase
        .from("merchant_claims")
        .select("id, merchant_id, status, created_at")
        .eq("user_id", userId)
        .eq("status", "PENDING");

      const claimRes = typeof (claimQuery as any).range === "function"
        ? await (claimQuery as any).order("created_at", { ascending: false }).range(0, 99)
        : await claimQuery;

      if (claimRes && Array.isArray(claimRes.data)) {
        pendingClaims = claimRes.data.filter(
          (item: any) => item && item.status === "PENDING" && !ownedMerchantIds.has(item.merchant_id)
        );
      }
    } catch {
      pendingClaims = [];
    }

    const pendingClaimMerchantIds = Array.from(
      new Set(pendingClaims.map((c) => c.merchant_id).filter(Boolean))
    );

    let claimMerchants: any[] = [];
    if (pendingClaimMerchantIds.length > 0) {
      try {
        const { data: mData } = await supabase
          .from("merchants")
          .select("id, name, address, publish_status, verification_status")
          .in("id", pendingClaimMerchantIds);

        if (mData) {
          claimMerchants = mData;
        }
      } catch {
        claimMerchants = [];
      }
    }

    const pendingClaimItems = claimMerchants.map((m) => ({
      id: m.id,
      name: m.name,
      address: m.address || null,
      publish_status: m.publish_status,
      verification_status: m.verification_status,
      relationshipState: "CLAIM_PENDING" as const,
      statusLabel: "Claim sedang diperiksa",
      canCreateCampaign: false,
      reason: "CLAIM_PENDING",
      detailMessage: "Setelah kepemilikan disetujui, usaha dapat dipromosikan.",
      actionLabel: "Lihat Status",
      actionHref: "/umkm#klaim",
      isOwnedByMe: false,
    }));

    // 4. Evaluate server-authoritative promotion eligibility for owned canonical merchants
    const ownershipService = new MerchantOwnershipService(supabase);
    const eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);

    const evaluatedOwned = await Promise.all(
      owned.map(async (m) => {
        const result = await eligibilityService.checkEligibility(userId, m.id);
        let statusLabel = "Siap dipromosikan";
        let detailMessage = "Usaha siap dipromosikan.";
        let actionLabel = "Buat Promosi";
        let actionHref = `/umkm/advertising?merchantId=${encodeURIComponent(m.id)}#buat-promosi`;

        if (!result.eligible) {
          if (result.reason === "PROFILE_INCOMPLETE") {
            statusLabel = "Profil perlu dilengkapi";
            detailMessage =
              "Data profil usaha belum memenuhi persyaratan promosi. Periksa bagian yang perlu dilengkapi.";
            actionLabel = "Lengkapi Profil";
            actionHref = `/umkm?merchantId=${encodeURIComponent(m.id)}#visibilitas`;
          } else {
            statusLabel = "Belum memenuhi syarat promosi";
            detailMessage = "Usaha belum memenuhi persyaratan promosi.";
            actionLabel = "Lihat Detail";
            actionHref = `/umkm?merchantId=${encodeURIComponent(m.id)}#visibilitas`;
          }
        }

        return {
          id: m.id,
          name: m.name,
          address: m.address || null,
          publish_status: m.publish_status,
          verification_status: m.verification_status,
          relationshipState: "VERIFIED_OWNER" as const,
          statusLabel,
          canCreateCampaign: result.eligible,
          reason: result.eligible ? null : result.reason,
          detailMessage,
          actionLabel,
          actionHref,
          isOwnedByMe: true,
        };
      })
    );

    const ownedEligible = evaluatedOwned.filter((item) => item.canCreateCampaign);
    const ineligible = [
      ...evaluatedOwned.filter((item) => !item.canCreateCampaign),
      ...pendingSubmissionItems,
      ...pendingClaimItems,
    ];
    const allBusinesses = [...evaluatedOwned, ...pendingSubmissionItems, ...pendingClaimItems];

    return createSuccessResponse(reqId, {
      ownedMerchants: ownedEligible,
      ineligibleMerchants: ineligible,
      allBusinesses,
      recommendedMerchants: [],
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/my-merchants");

