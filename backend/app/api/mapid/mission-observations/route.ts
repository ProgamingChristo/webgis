import { NextRequest } from "next/server";

import { createOptionsHandler } from "@/src/lib/api-security";
import { createListResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { mapidMissionReadQuerySchema } from "@/src/integrations/mapid/mission.schema";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import { ApplicationError } from "@/src/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  return withApiLogger(request, requestId, async () => {
    await requireAuthenticatedUser(request);
    const parsed = mapidMissionReadQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const authorization = request.headers.get("authorization");
    if (!authorization) throw new ApplicationError("UNAUTHORIZED");

    const repository = new MapidMissionRepository(
      getRequestSupabaseClient(authorization),
    );
    const result = await repository.listObservations({
      bbox: parsed.bbox ? parseBbox(parsed.bbox) : undefined,
      limit: parsed.limit,
      offset: parsed.offset,
      sourceType: parsed.source_type,
    });

    return createListResponse(requestId, result.items, {
      page: Math.floor(parsed.offset / parsed.limit) + 1,
      limit: parsed.limit,
      total: result.total,
      total_pages: Math.ceil(result.total / parsed.limit),
    });
  });
}

function parseBbox(value: string) {
  const parts = value.split(",").map((item) => Number(item.trim()));
  if (
    parts.length !== 4 ||
    parts.some((item) => !Number.isFinite(item)) ||
    parts[0] >= parts[2] ||
    parts[1] >= parts[3] ||
    parts[0] < -180 ||
    parts[2] > 180 ||
    parts[1] < -90 ||
    parts[3] > 90
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "Invalid bbox query.");
  }

  return {
    maxLat: parts[3],
    maxLng: parts[2],
    minLat: parts[1],
    minLng: parts[0],
  };
}

export const OPTIONS = createOptionsHandler("/api/mapid/mission-observations");
