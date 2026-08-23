import { NextRequest, NextResponse } from "next/server";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { AdvertisingEligibilityService } from "@/src/features/umkm-advertising";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const merchantId = req.nextUrl.searchParams.get("merchantId");
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required" } },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const ownershipService = new MerchantOwnershipService(supabase);
    const eligibilityService = new AdvertisingEligibilityService(
      supabase,
      ownershipService
    );

    const result = await eligibilityService.checkEligibility(
      userId,
      merchantId
    );

    return createSuccessResponse(reqId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/eligibility");
