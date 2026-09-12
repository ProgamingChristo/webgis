import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { calculateRouteProgress, type RouteProgressInput } from "@/src/features/routing/route-progress.service";
import { createOptionsHandler } from "@/src/lib/api-security";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { ApplicationError } from "@/src/lib/errors";

const coordinate = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();

const maneuver = z.object({
  distance_meters: z.number().finite().nonnegative().max(5_000_000),
  instruction: z.string().max(500),
  time_seconds: z.number().finite().nonnegative().max(604_800),
  type: z.number().int().nullable(),
}).strict();

const inputSchema = z.object({
  accuracy_meters: z.number().finite().nonnegative().max(500),
  current_position: coordinate,
  mode: z.enum(["walking", "motorcycle", "car"]),
  route: z.object({
    distance_meters: z.number().finite().positive().max(5_000_000),
    duration_seconds: z.number().finite().positive().max(604_800),
    geometry: z.object({
      type: z.literal("LineString"),
      coordinates: z.array(z.tuple([
        z.number().finite().min(-180).max(180),
        z.number().finite().min(-90).max(90),
      ])).min(2).max(10_000),
    }).strict(),
    maneuvers: z.array(maneuver).max(500),
  }).strict(),
}).strict();

export interface RouteProgressDependencies {
  authorize: typeof requireAuthenticatedUser;
  checkLimit: typeof rateLimiter.checkLimit;
  calculate(input: RouteProgressInput): ReturnType<typeof calculateRouteProgress>;
}

const dependencies: RouteProgressDependencies = {
  authorize: requireAuthenticatedUser,
  checkLimit: rateLimiter.checkLimit.bind(rateLimiter),
  calculate: calculateRouteProgress,
};

export function createRouteProgressHandler(overrides: RouteProgressDependencies = dependencies) {
  return async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await overrides.authorize(request);
      await overrides.checkLimit(request, `${userId}:spatial:routing-progress`);
      const parsed = inputSchema.safeParse(await readBoundedJsonBody(request, 512_000));
      if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
      return createSuccessResponse(requestId, overrides.calculate(parsed.data));
    });
  };
}

export const POST = createRouteProgressHandler();
export const OPTIONS = createOptionsHandler("/api/routing/progress");
