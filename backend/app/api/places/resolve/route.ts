import { NextRequest } from "next/server";
import { z } from "zod";

import {
  reverseGeocodePlace,
  searchGeocodedPlaces,
} from "@/src/features/place-resolution/geocoding.service";
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

    const searchParams = new URL(request.url).searchParams;
    const latParam = searchParams.get("lat") ?? searchParams.get("latitude");
    const lngParam = searchParams.get("lng") ?? searchParams.get("lon") ?? searchParams.get("longitude");

    if (latParam !== null && lngParam !== null) {
      const lat = Number(latParam);
      const lng = Number(lngParam);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new ApplicationError("VALIDATION_ERROR", "Koordinat tidak valid.");
      }
      const reverseResult = await reverseGeocodePlace(lat, lng);
      return createSuccessResponse(requestId, {
        address: reverseResult?.address ?? "",
        display_name: reverseResult?.display_name ?? "",
        latitude: lat,
        longitude: lng,
        source: "OPENSTREETMAP_NOMINATIM",
      });
    }

    const parsed = QuerySchema.safeParse(searchParams.get("q"));
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
