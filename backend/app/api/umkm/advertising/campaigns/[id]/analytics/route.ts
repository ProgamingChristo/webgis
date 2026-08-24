import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import {
  CampaignAnalyticsService,
  campaignAnalyticsQuerySchema,
} from "@/src/features/umkm-advertising";

export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);
  const { id } = await params;

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from") || undefined;
    const toParam = searchParams.get("to") || undefined;
    const placementParam = searchParams.get("placement") || undefined;

    const parsedQuery = campaignAnalyticsQuerySchema.safeParse({
      from: fromParam,
      to: toParam,
      placement: placementParam,
    });

    if (!parsedQuery.success) {
      const errMsg = parsedQuery.error.issues[0]?.message || "Parameter query tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", errMsg));
    }

    const service = new CampaignAnalyticsService(supabase);
    const analytics = await service.getCampaignAnalytics(
      id,
      userId,
      parsedQuery.data.from,
      parsedQuery.data.to,
      parsedQuery.data.placement
    );

    return createSuccessResponse(reqId, analytics);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/advertising/campaigns/[id]/analytics");
