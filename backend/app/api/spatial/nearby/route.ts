import type { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { createRequestSpatialService, getStrictSearchParams } from "@/src/modules/spatial/spatial-api";
import {
  loadSpatialConfig,
  type SpatialConfig,
} from "@/src/modules/spatial/spatial.config";
import { parseNearbyQuery } from "@/src/modules/spatial/spatial.schema";
import type { NearbyResult } from "@/src/modules/spatial/spatial.types";
import { createOptionsHandler } from "@/src/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 15;

interface NearbyEndpointService {
  findNearby(input: unknown): Promise<NearbyResult>;
}

export interface NearbyHandlerDependencies {
  authenticate(request: NextRequest): Promise<string>;
  createService(
    request: NextRequest,
    config: SpatialConfig,
  ): NearbyEndpointService;
  loadConfig(): SpatialConfig;
  rateLimiter: RateLimiter;
}

const defaultDependencies: NearbyHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: createRequestSpatialService,
  loadConfig: loadSpatialConfig,
  rateLimiter,
};

export function createNearbyHandler(
  dependencies: NearbyHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:spatial:nearby`,
      );
      const config = dependencies.loadConfig();
      const query = parseNearbyQuery(
        getStrictSearchParams(request),
        config.maxRadiusMeters,
      );
      const service = dependencies.createService(request, config);
      const result = await service.findNearby(query);
      return createSuccessResponse(requestId, result);
    });
  };
}

export const GET = createNearbyHandler();
export const OPTIONS = createOptionsHandler("/api/spatial/nearby");
