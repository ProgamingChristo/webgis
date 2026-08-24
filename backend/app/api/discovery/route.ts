import { NextRequest, NextResponse } from "next/server";
import {
  FairDiscoveryCompositionService,
  discoveryQuerySchema,
} from "@/src/features/fair-discovery";
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
    const parsed = discoveryQuerySchema.safeParse({
      longitude: searchParams.get("longitude") || searchParams.get("lng"),
      latitude: searchParams.get("latitude") || searchParams.get("lat"),
      radius_meters: searchParams.get("radius_meters") || searchParams.get("radiusMeters") || undefined,
      category: searchParams.get("category") || undefined,
      query: searchParams.get("query") || searchParams.get("q") || undefined,
      open_now: searchParams.get("open_now") || undefined,
      max_walking_minutes: searchParams.get("max_walking_minutes") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message || "Parameter pencarian tidak valid.",
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
      limit,
    } = parsed.data;

    const authHeader = req.headers.get("Authorization");
    const supabase = getRequestSupabaseClient(authHeader || "");

    const compositionService = new FairDiscoveryCompositionService(supabase);
    const result = await compositionService.discover({
      origin: { longitude, latitude },
      radiusMeters: radius_meters,
      category,
      query: searchTerm,
      openNow: open_now,
      maxWalkingMinutes: max_walking_minutes,
      limit,
    });

    const response = createSuccessResponse(reqId, result);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const body = await req.json().catch(() => ({}));

    const origin = body.origin || {
      longitude: body.longitude,
      latitude: body.latitude,
    };

    const parsed = discoveryQuerySchema.safeParse({
      longitude: origin?.longitude,
      latitude: origin?.latitude,
      radius_meters: body.radius_meters || body.radiusMeters,
      category: body.category,
      query: body.query || body.q,
      open_now: body.open_now || body.openNow,
      max_walking_minutes: body.max_walking_minutes || body.maxWalkingMinutes,
      limit: body.limit,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message || "Parameter pencarian tidak valid.",
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
      limit,
    } = parsed.data;

    const authHeader = req.headers.get("Authorization");
    const supabase = getRequestSupabaseClient(authHeader || "");

    const compositionService = new FairDiscoveryCompositionService(supabase);
    const result = await compositionService.discover({
      origin: { longitude, latitude },
      radiusMeters: radius_meters,
      category,
      query: searchTerm,
      openNow: open_now,
      maxWalkingMinutes: max_walking_minutes,
      limit,
    });

    const response = createSuccessResponse(reqId, result);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  });
}

export const OPTIONS = createOptionsHandler("/api/discovery");
