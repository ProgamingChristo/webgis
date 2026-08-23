import { NextRequest, NextResponse } from "next/server";
import { AdServingService, queryCandidatesSchema } from "@/src/features/umkm-advertising/ad-serving";
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
    const parsed = queryCandidatesSchema.safeParse({
      longitude: searchParams.get("longitude"),
      latitude: searchParams.get("latitude"),
      limit: searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              parsed.error.issues[0]?.message ||
              "Parameter koordinat tidak valid.",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const { longitude, latitude, limit } = parsed.data;
    const authHeader = req.headers.get("Authorization");
    const supabase = getRequestSupabaseClient(authHeader || "");

    const service = new AdServingService(supabase);
    const candidates = await service.getSponsoredPinCandidates({
      context: { longitude, latitude },
      limit,
    });

    const response = createSuccessResponse(reqId, candidates);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return response;
  });
}

export const OPTIONS = createOptionsHandler("/api/advertising/placements/sponsored-pins");
