import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { createOptionsHandler } from "@/src/lib/api-security";
import {
  latitudeSchema,
  longitudeSchema,
} from "@/src/schemas/spatial.schema";

const nearestTransportRequestSchema = z
  .object({
    origin: z
      .object({
        latitude: latitudeSchema,
        longitude: longitudeSchema,
      })
      .strict(),
    radius_meters: z.number().finite().positive().max(50_000).optional(),
  })
  .strict();

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      throw new ApplicationError("UNAUTHORIZED");
    }

    const userId = await requireAuthenticatedUser(request);
    await rateLimiter.checkLimit(request, `${userId}:transport:nearest`);

    const body = await readBoundedJsonBody(request, 10_240);
    const parsed = nearestTransportRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    const radiusMeters = parsed.data.radius_meters ?? 2_000;
    const supabase = getRequestSupabaseClient(authorization);
    const repository = new TransportNodeRepository(supabase);

    const result = await repository.findNear(
      {
        latitude: parsed.data.origin.latitude,
        longitude: parsed.data.origin.longitude,
        radius_meters: radiusMeters,
      },
      {
        limit: 10,
        offset: 0,
        page: 1,
        sort: "created_at",
        order: "desc",
      },
    );

    return createSuccessResponse(
      requestId,
      {
        analysis_method: "find_transport_nodes_near",
        radius_meters: radiusMeters,
        records: result.items,
        returned_count: result.items.length,
        source: "GETRA_SPATIAL_ENGINE",
      },
    );
  });
}

export const OPTIONS = createOptionsHandler("/api/transport/nearest");
