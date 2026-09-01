import type { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { AnalyticsEventService } from "@/src/features/demand-intelligence";
import {
  getRoutingProvider,
  routingFailureCodeFromError,
  type NavigationRouteRequest,
  type NavigationRouteResult,
} from "@/src/features/routing";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { parseRoutingRequest } from "@/src/modules/spatial/spatial.schema";
import { createOptionsHandler } from "@/src/lib/api-security";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 15;

export interface RoutingRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  checkLimit: typeof rateLimiter.checkLimit;
  route: (input: NavigationRouteRequest, signal?: AbortSignal) => Promise<NavigationRouteResult>;
  recordRoute?: (actorId: string, merchantId: string, outcome: string) => Promise<void>;
}

const routingDependencies: RoutingRouteDependencies = {
  authorize: requireAuthenticatedUser,
  checkLimit: rateLimiter.checkLimit.bind(rateLimiter),
  route: (input, signal) => getRoutingProvider().route(input, signal),
  recordRoute: (actorId, merchantId, outcome) => new AnalyticsEventService(
    getServiceRoleSupabaseClient(),
  ).recordRoute(actorId, merchantId, outcome),
};

export function createRoutingHandler(dependencies: RoutingRouteDependencies = routingDependencies) {
  return async function handler(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    const userId = await dependencies.authorize(request);

    await dependencies.checkLimit(request, `${userId}:spatial:routing`);

    const body = await readBoundedJsonBody(request, 10_240);
    const input = parseRoutingRequest(body);

    let result: NavigationRouteResult;
    try {
      result = await dependencies.route({
        origin: input.origin,
        destination: input.destination,
        mode: input.mode,
      }, request.signal);
    } catch (error) {
      const reasonCode = routingFailureCodeFromError(error, request.signal);
      logger.error("[ROUTING] Provider request failed", {
        request_id: requestId,
        error_code: reasonCode,
        mode: input.mode,
      });
      result = {
        mode: input.mode,
        reason_code: reasonCode,
        route_status: "SERVICE_UNAVAILABLE",
        distance_meters: null,
        duration_seconds: null,
        geometry: null,
        maneuvers: [],
        engine: "valhalla",
        warnings: ["Layanan navigasi sedang tidak tersedia."],
        has_toll: false,
        has_highway: false,
        has_ferry: false,
        source: "OPENSTREETMAP",
      };
    }

    if (input.destination_merchant_id) {
      await dependencies.recordRoute?.(userId, input.destination_merchant_id, result.route_status);
    }

    return createSuccessResponse(requestId, {
      ...result,
      analysis_method: "navigation_route",
      limitation_flags: result.route_status === "ROUTABLE" ? [] : ["NO_FABRICATED_ROUTE"],
      route_source: result.engine,
    });
  });
  };
}

export const POST = createRoutingHandler();

export const OPTIONS = createOptionsHandler("/api/routing");
