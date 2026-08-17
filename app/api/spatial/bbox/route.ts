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
import { parseBBoxQuery } from "@/src/modules/spatial/spatial.schema";
import type { BBoxResult } from "@/src/modules/spatial/spatial.types";
import { createOptionsHandler } from "@/src/lib/api-security";

export const runtime = "nodejs";
export const maxDuration = 15;

interface BBoxEndpointService {
  findWithinBBox(input: unknown): Promise<BBoxResult>;
}

export interface BBoxHandlerDependencies {
  authenticate(request: NextRequest): Promise<string>;
  createService(
    request: NextRequest,
    config: SpatialConfig,
  ): BBoxEndpointService;
  loadConfig(): SpatialConfig;
  rateLimiter: RateLimiter;
}

const defaultDependencies: BBoxHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: createRequestSpatialService,
  loadConfig: loadSpatialConfig,
  rateLimiter,
};

export function createBBoxHandler(
  dependencies: BBoxHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:spatial:bbox`,
      );
      const config = dependencies.loadConfig();
      const query = parseBBoxQuery(
        getStrictSearchParams(request),
        config.maxBboxLongitudeDegrees,
        config.maxBboxLatitudeDegrees,
      );
      const service = dependencies.createService(request, config);
      const result = await service.findWithinBBox(query);
      return createSuccessResponse(requestId, result);
    });
  };
}

export const GET = createBBoxHandler();
export const OPTIONS = createOptionsHandler("/api/spatial/bbox");
