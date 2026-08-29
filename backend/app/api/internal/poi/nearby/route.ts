import { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { PoiService } from "@/src/modules/poi/poi.service";
import { PoiRepository } from "@/src/repositories/poi.repository";
import { EntityAccessService } from "@/src/modules/accessibility/entity-access.service";
import { EntityNetworkAccessRepository } from "@/src/repositories/entity-network-access.repository";
import { createOptionsHandler } from "@/src/lib/api-security";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(req);
  return withApiLogger(req, requestId, async () => {
    const authorization = req.headers.get("authorization");
    if (!authorization) {
      throw new ApplicationError("UNAUTHORIZED");
    }

    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:api:internal-poi-nearby`);

    const searchParams = req.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radiusMeters = parseFloat(
      searchParams.get("radiusMeters") || "1000",
    );
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const environment = searchParams.get("environment") || "DUMMY";

    if (isNaN(lat) || isNaN(lng)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Invalid coordinates",
      );
    }

    const supabase = getRequestSupabaseClient(authorization);
    const poiRepo = new PoiRepository(supabase);
    const accessRepo = new EntityNetworkAccessRepository(supabase);
    const accessService = new EntityAccessService(supabase, accessRepo);
    const poiService = new PoiService(supabase, poiRepo, accessService);

    const results = await poiService.findNearby({
      lat,
      lng,
      radiusMeters,
      category,
      limit,
      environment,
    });

    return NextResponse.json({ data: results });
  });
}

export const OPTIONS = createOptionsHandler("/api/internal/poi/nearby");
