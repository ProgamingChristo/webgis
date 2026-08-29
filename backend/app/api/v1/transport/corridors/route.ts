import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { TransportCorridorRepository } from "@/src/repositories/transport-corridor.repository";
import { TransportCorridorService } from "@/src/modules/transport-corridor/transport-corridor.service";
import { createSpatialService } from "@/src/modules/spatial/spatial.service";
import { loadSpatialConfig } from "@/src/modules/spatial/spatial.config";

export const runtime = "nodejs";

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(request);

  return withApiLogger(request, requestId, async () => {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      throw new ApplicationError("UNAUTHORIZED");
    }

    const userId = await requireAuthenticatedUser(request);
    await rateLimiter.checkLimit(request, `${userId}:api:v1-transport-corridors`);

    const { searchParams } = new URL(request.url);
    const parsed = PaginationSchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      page: searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
    const { limit, page } = parsed.data;

    const supabase = getRequestSupabaseClient(authorization);
    const repo = new TransportCorridorRepository(supabase);
    const config = loadSpatialConfig();
    const spatial = createSpatialService(supabase, config);
    const service = new TransportCorridorService(repo, spatial);

    const result = await service.findCorridors({
      limit,
      page,
      offset: (page - 1) * limit,
      sort: "created_at",
      order: "desc",
    });

    return NextResponse.json(result);
  });
}

export const OPTIONS = createOptionsHandler("/api/v1/transport/corridors");
