import { NextRequest, NextResponse } from "next/server";
import { CampaignService, CampaignRepository, AdvertisingEligibilityService, updateCampaignSchema } from "@/src/features/umkm-advertising";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

function getServices(authHeader: string) {
  const supabase = getRequestSupabaseClient(authHeader);
  const ownershipService = new MerchantOwnershipService(supabase);
  const eligibilityService = new AdvertisingEligibilityService(supabase, ownershipService);
  const repo = new CampaignRepository(supabase);
  const campaignService = new CampaignService(repo, eligibilityService);
  return { supabase, campaignService };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const campaignId = (await params).id;
    const authHeader = req.headers.get("Authorization")!;
    const { campaignService } = getServices(authHeader);

    const campaign = await campaignService.getCampaignById(userId, campaignId);
    return createSuccessResponse(reqId, campaign);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const campaignId = (await params).id;
    const authHeader = req.headers.get("Authorization")!;
    const { campaignService } = getServices(authHeader);

    const body = await req.json();
    const parseResult = updateCampaignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: { message: "Invalid input", details: parseResult.error.format() } }, { status: 400 });
    }

    const campaign = await campaignService.updateCampaign(userId, campaignId, parseResult.data);
    return createSuccessResponse(reqId, campaign);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]");
