import { NextRequest, NextResponse } from "next/server";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { updateCreativeSchema } from "@/src/features/umkm-advertising/creative/schemas/creative.schema";
import { CreativeService } from "@/src/features/umkm-advertising/creative/services/creative.service";
import { getMerchantIdFromRequest } from "@/src/features/umkm-advertising/utils/request-context";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; creativeId: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireAuthenticatedUser(req);
    const authorization = req.headers.get("Authorization")!;
    const { id, creativeId } = await params;
    const supabase = getRequestSupabaseClient(authorization);
    const service = new CreativeService(supabase);
    
    const merchantId = getMerchantIdFromRequest(req);
    if (!merchantId) {
      return NextResponse.json({ success: false, error: { message: "Merchant ID tidak valid" } }, { status: 400 });
    }

    const creative = await service.getCreativeById(merchantId, id, creativeId);
    return createSuccessResponse(reqId, creative);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; creativeId: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireAuthenticatedUser(req);
    const authorization = req.headers.get("Authorization")!;
    const { id, creativeId } = await params;
    const supabase = getRequestSupabaseClient(authorization);
    const service = new CreativeService(supabase);
    
    const merchantId = getMerchantIdFromRequest(req);
    if (!merchantId) {
      return NextResponse.json({ success: false, error: { message: "Merchant ID tidak valid" } }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateCreativeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: { message: "Data tidak valid", details: validation.error.issues } }, { status: 400 });
    }

    const creative = await service.updateCreative(merchantId, id, creativeId, validation.data);
    return createSuccessResponse(reqId, creative);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/creatives/[creativeId]");
