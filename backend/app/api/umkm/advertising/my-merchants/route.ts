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

    // 1. Fetch merchants owned by current user
    const { data: owned, error: ownedError } = await supabase
      .from("merchants")
      .select("id, name, address, publish_status, verification_status")
      .eq("owner_id", userId)
      .order("name", { ascending: true })
      .limit(20);

    if (ownedError) {
      return NextResponse.json(
        { success: false, error: { message: ownedError.message } },
        { status: 500 }
      );
    }

    const ownershipService = new MerchantOwnershipService(supabase);
    const eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
    const eligibility = await Promise.all((owned || []).map(async (merchant) => ({
      merchant,
      result: await eligibilityService.checkEligibility(userId, merchant.id),
    })));

    return createSuccessResponse(reqId, {
      ownedMerchants: eligibility.filter((item) => item.result.eligible).map((item) => item.merchant),
      ineligibleMerchants: eligibility.filter((item) => !item.result.eligible).map((item) => ({
        ...item.merchant,
        reason: item.result.eligible ? null : item.result.reason,
      })),
      recommendedMerchants: [],
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/my-merchants");
