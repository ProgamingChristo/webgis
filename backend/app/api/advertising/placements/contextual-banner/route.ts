import { NextRequest, NextResponse } from "next/server";
import {
  ContextualBannerServingService,
  contextualBannerQuerySchema,
} from "@/src/features/umkm-advertising";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const searchParams = req.nextUrl.searchParams;
    const parsed = contextualBannerQuerySchema.safeParse({
      longitude: searchParams.get("longitude") || searchParams.get("lng"),
      latitude: searchParams.get("latitude") || searchParams.get("lat"),
      radius_meters: searchParams.get("radius_meters") || searchParams.get("radiusMeters") || undefined,
      category: searchParams.get("category") || undefined,
      query: searchParams.get("query") || searchParams.get("q") || undefined,
      open_now: searchParams.get("open_now") || undefined,
      max_walking_minutes: searchParams.get("max_walking_minutes") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message || "Parameter context tidak valid.",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const {
      longitude,
      latitude,
      radius_meters,
      category,
      query: searchTerm,
      open_now,
      max_walking_minutes,
    } = parsed.data;

    const authHeader = req.headers.get("Authorization");
    const supabase = getRequestSupabaseClient(authHeader || "");

    const servingService = new ContextualBannerServingService(supabase);
    const placement = await servingService.getEligibleBanner({
      longitude,
      latitude,
      radiusMeters: radius_meters,
      category,
      query: searchTerm,
      openNow: open_now,
      maxWalkingMinutes: max_walking_minutes,
    });

    const response = createSuccessResponse(reqId, placement);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  });
}

export const OPTIONS = createOptionsHandler("/api/advertising/placements/contextual-banner");
