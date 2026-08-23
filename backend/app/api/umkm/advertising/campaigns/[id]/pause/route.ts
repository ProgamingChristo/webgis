import { NextRequest, NextResponse } from "next/server";
import { CampaignLifecycleService } from "@/src/features/umkm-advertising/lifecycle";
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
  { params }: RouteContext<"/api/umkm/advertising/campaigns/[id]/pause">
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

    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const service = new CampaignLifecycleService(supabase);
    const result = await service.pauseCampaign(merchantId, campaignId);

    return createSuccessResponse(reqId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/pause");
