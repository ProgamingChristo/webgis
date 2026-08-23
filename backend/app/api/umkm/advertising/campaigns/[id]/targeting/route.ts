import { NextRequest, NextResponse } from "next/server";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { TargetingService } from "@/src/features/umkm-advertising/targeting/services/targeting.service";
import { saveTargetingSchema } from "@/src/features/umkm-advertising/targeting/schemas/targeting.schema";
import { getMerchantIdFromRequest } from "@/src/features/umkm-advertising/utils/request-context";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireAuthenticatedUser(req);
    const authorization = req.headers.get("Authorization")!;
    const { id } = await params;
    const supabase = getRequestSupabaseClient(authorization);
    const service = new TargetingService(supabase);

    const merchantId = getMerchantIdFromRequest(req);
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "Merchant ID tidak valid" } },
        { status: 400 }
      );
    }

    const targeting = await service.getCampaignTarget(merchantId, id);
    return createSuccessResponse(reqId, targeting);
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireAuthenticatedUser(req);
    const authorization = req.headers.get("Authorization")!;
    const { id } = await params;
    const supabase = getRequestSupabaseClient(authorization);
    const service = new TargetingService(supabase);

    const merchantId = getMerchantIdFromRequest(req);
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: { message: "Merchant ID tidak valid" } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = saveTargetingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Data targeting tidak valid",
            details: validation.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const targeting = await service.saveCampaignTarget(merchantId, id, validation.data);
    return createSuccessResponse(reqId, targeting);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/targeting");
