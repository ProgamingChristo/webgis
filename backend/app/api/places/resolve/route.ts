import { NextRequest } from "next/server";
import { z } from "zod";

import { searchGeocodedPlaces } from "@/src/features/place-resolution/geocoding.service";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";

export const runtime = "nodejs";
export const maxDuration = 10;

const QuerySchema = z.string().trim().min(2).max(120);

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    const userId = await requireAuthenticatedUser(request);
    await rateLimiter.checkLimit(request, `${userId}:spatial:place-resolve`);
    const parsed = QuerySchema.safeParse(new URL(request.url).searchParams.get("q"));
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
    const candidates = await searchGeocodedPlaces(parsed.data);
    return createSuccessResponse(requestId, {
      candidates,
      query: parsed.data,
      source: "OPENSTREETMAP_NOMINATIM",
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/places/resolve");
