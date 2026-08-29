import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { RoutingService } from "@/src/modules/pedestrian-network/routing.service";

export const runtime = "nodejs";

const WalkingRouteRequestSchema = z.object({
  originRoutingId: z.coerce.number().int().nonnegative(),
  destinationRoutingId: z.coerce.number().int().nonnegative(),
  environment: z.string().trim().min(1).max(64).optional().default("DUMMY"),
}).strict();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(req);
  return withApiLogger(req, requestId, async () => {
    const authorization = req.headers.get("authorization");
    if (!authorization) {
      throw new ApplicationError("UNAUTHORIZED");
    }

    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:spatial:internal-routing-walking`);

    const body = await readBoundedJsonBody(req, 4_096);
    const parsed = WalkingRouteRequestSchema.safeParse(body);
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
    const { originRoutingId, destinationRoutingId, environment } = parsed.data;

    const supabase = getRequestSupabaseClient(authorization);
    const routingService = new RoutingService(supabase);

    const result = await routingService.getShortestPath(
      originRoutingId,
      destinationRoutingId,
      environment,
    );

    return NextResponse.json({ data: result }, { status: 200 });
  });
}

export const OPTIONS = createOptionsHandler("/api/internal/routing/walking");
