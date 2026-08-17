import type { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { MAX_SPATIAL_JSON_BODY_BYTES } from "@/src/modules/spatial/spatial.constants";
import {
  loadSpatialConfig,
  type SpatialConfig,
} from "@/src/modules/spatial/spatial.config";
import { createRequestSpatialService } from "@/src/modules/spatial/spatial-api";
import { parseDistanceRequest } from "@/src/modules/spatial/spatial.schema";
import type { DistanceResult } from "@/src/modules/spatial/spatial.types";
import { createOptionsHandler } from "@/src/lib/api-security";
import { loadApiSecurityConfig } from "@/src/lib/api-security/config";

export const runtime = "nodejs";
export const maxDuration = 15;

interface DistanceEndpointService {
  calculateDistance(input: unknown): Promise<DistanceResult>;
}

export interface DistanceHandlerDependencies {
  authenticate(request: NextRequest): Promise<string>;
  createService(
    request: NextRequest,
    config: SpatialConfig,
  ): DistanceEndpointService;
  loadConfig(): SpatialConfig;
  rateLimiter: RateLimiter;
  readBody(request: Request, maximumBytes: number): Promise<unknown>;
}

const defaultDependencies: DistanceHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: createRequestSpatialService,
  loadConfig: loadSpatialConfig,
  rateLimiter,
  readBody: readBoundedJsonBody,
};

export function createDistanceHandler(
  dependencies: DistanceHandlerDependencies = defaultDependencies,
) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:spatial:distance`,
      );
      const body = await dependencies.readBody(
        request,
        Math.min(
          MAX_SPATIAL_JSON_BODY_BYTES,
          loadApiSecurityConfig().maxJsonBodyBytes,
        ),
      );
      const input = parseDistanceRequest(body);
      const config = dependencies.loadConfig();
      const service = dependencies.createService(request, config);
      const result = await service.calculateDistance(input);
      return createSuccessResponse(requestId, result);
    });
  };
}

export const POST = createDistanceHandler();
export const OPTIONS = createOptionsHandler("/api/spatial/distance");
