import type { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { CommuterNetworkRepository } from "@/src/features/commuter";
import { AnalyticsEventService } from "@/src/features/demand-intelligence";
import { parseRoutingRequest } from "@/src/modules/spatial/spatial.schema";
import { createOptionsHandler } from "@/src/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 15;

export interface RoutingRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  checkLimit: typeof rateLimiter.checkLimit;
  route: CommuterNetworkRepository["route"];
  recordRoute?: (actorId: string, merchantId: string, outcome: string) => Promise<void>;
}

const routingDependencies: RoutingRouteDependencies = {
  authorize: requireAuthenticatedUser,
  checkLimit: rateLimiter.checkLimit.bind(rateLimiter),
  route: (origin, destination) => new CommuterNetworkRepository(
    getServiceRoleSupabaseClient(),
  ).route(origin, destination),
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

    const result = await dependencies.route(
      {
        latitude: input.origin.latitude,
        longitude: input.origin.longitude,
        source: "EXPLICIT_ORIGIN",
      },
      input.destination,
    );

    if (input.destination_merchant_id) {
      await dependencies.recordRoute?.(userId, input.destination_merchant_id, result.status);
    }

    if (result.status !== "ROUTABLE") {
      return createSuccessResponse(requestId, {
        route_status: result.status ?? "UNROUTABLE",
        analysis_method: "pgrouting_network_route",
        distance_meters: null,
        network_distance_meters: null,
        access_distance_meters: null,
        duration_seconds: null,
        geometry: null,
        limitation_flags: ["NO_FABRICATED_ROUTE"],
        route_source: "pgr_dijkstra",
        source: "GETRA_PEDESTRIAN_NETWORK",
      });
    }

    return createSuccessResponse(requestId, {
      route_status: "ROUTABLE",
      analysis_method: "pgrouting_network_route",
      distance_meters: Number(result.distance_meters),
      network_distance_meters: Number(result.network_distance_meters),
      access_distance_meters: Number(result.access_distance_meters),
      duration_seconds: Number(result.duration_seconds),
      geometry: result.geometry,
      limitation_flags: ["BOUNDED_NETWORK_SNAP"],
      route_source: "pgr_dijkstra",
      source: "GETRA_PEDESTRIAN_NETWORK",
      walking_speed_mps: Number(result.walking_speed_mps),
    });
  });
  };
}

export const POST = createRoutingHandler();

export const OPTIONS = createOptionsHandler("/api/routing");
