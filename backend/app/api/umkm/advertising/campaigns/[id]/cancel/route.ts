import { NextRequest, NextResponse } from "next/server";
import { CampaignService, CampaignRepository, AdvertisingEligibilityService } from "@/src/features/umkm-advertising";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const campaignId = (await params).id;
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const ownershipService = new MerchantOwnershipService(supabase);
    const eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
    const repo = new CampaignRepository(supabase);
    const campaignService = new CampaignService(repo, eligibilityService);

    const campaign = await campaignService.cancelCampaign(userId, campaignId);
    return createSuccessResponse(reqId, campaign);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/cancel");
