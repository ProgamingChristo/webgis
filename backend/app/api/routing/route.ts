import type { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { ExternalRoadRoutingService } from "@/src/modules/pedestrian-network/external-road-routing.service";
import { RoutingService } from "@/src/modules/pedestrian-network/routing.service";
import { parseRoutingRequest } from "@/src/modules/spatial/spatial.schema";
import { SpatialError } from "@/src/modules/spatial/spatial.errors";
import { createOptionsHandler } from "@/src/lib/api-security";

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

    await rateLimiter.checkLimit(request, `${userId}:spatial:routing`);

    const body = await readBoundedJsonBody(request, 10_240);
    const input = parseRoutingRequest(body);

    const supabase = getRequestSupabaseClient(authorization);
    const routingService = new RoutingService(supabase);
    const externalRoadRoutingService = new ExternalRoadRoutingService();

    try {
      const result = await routingService.getRoute(
        input.origin.latitude,
        input.origin.longitude,
        input.destination.latitude,
        input.destination.longitude,
        5_000,
        "DUMMY",
      );

      return createSuccessResponse(requestId, {
        analysis_method: "pgrouting_network_route",
        distance_meters: result.distanceMeters,
        duration_seconds: result.durationSeconds,
        geometry: result.geometry,
        limitation_flags: ["FIXTURE_DATA", "ESTIMATED_WALKING_TIME"],
        route_source: "pgr_dijkstra",
        source: "GETRA_SPATIAL_ENGINE",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "";

      if (
        message.includes("NO_NEARBY_NETWORK") ||
        message.includes("No route found")
      ) {
        try {
          const result =
            await externalRoadRoutingService.getRoute(
              input.origin.latitude,
              input.origin.longitude,
              input.destination.latitude,
              input.destination.longitude,
            );

          return createSuccessResponse(requestId, {
            analysis_method: "external_road_network_route",
            distance_meters: result.distanceMeters,
            duration_seconds: result.durationSeconds,
            geometry: result.geometry,
            limitation_flags: [
              "EXTERNAL_OSRM_ROUTE",
              "ROAD_NETWORK_ROUTE",
              "PEDESTRIAN_NOT_VALIDATED",
              "ESTIMATED_WALKING_TIME",
            ],
            route_source: "osrm_road_network",
            source: "OSRM_PUBLIC_DEMO",
          });
        } catch {
          if (message.includes("NO_NEARBY_NETWORK")) {
            throw new SpatialError("SPATIAL_NETWORK_NOT_READY");
          }

          throw new SpatialError("ROUTING_GRAPH_NOT_AVAILABLE");
        }
      }

      throw error;
    }
  });
}

export const OPTIONS = createOptionsHandler("/api/routing");
