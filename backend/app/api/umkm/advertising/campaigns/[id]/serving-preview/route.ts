import { NextRequest, NextResponse } from "next/server";
import { SponsoredPinServingService } from "@/src/features/umkm-advertising/ad-serving";
import { getMerchantIdFromRequest } from "@/src/features/umkm-advertising/utils/request-context";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireAuthenticatedUser(req);
    const campaignId = (await params).id;

    const merchantId = getMerchantIdFromRequest(req);
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "merchantId is required via header or query" } },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const service = new SponsoredPinServingService(supabase);
    const result = await service.evaluateCampaignServing(merchantId, campaignId, body);

    const response = createSuccessResponse(reqId, result);
    response.headers.set("Cache-Control", "no-store");
    return response;
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/serving-preview");
