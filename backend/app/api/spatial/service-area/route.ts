import type { NextRequest } from "next/server";

import { CommuterNetworkRepository, serviceAreaRequestSchema } from "@/src/features/commuter";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

export interface ServiceAreaRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  checkLimit: typeof rateLimiter.checkLimit;
  serviceArea: CommuterNetworkRepository["serviceArea"];
}

const serviceAreaDependencies: ServiceAreaRouteDependencies = {
  authorize: requireAuthenticatedUser,
  checkLimit: rateLimiter.checkLimit.bind(rateLimiter),
  serviceArea: (origin, minutes) => new CommuterNetworkRepository(
    getServiceRoleSupabaseClient(),
  ).serviceArea(origin, minutes),
};

export function createServiceAreaHandler(
  dependencies: ServiceAreaRouteDependencies = serviceAreaDependencies,
) {
  return async function handler(request: NextRequest) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    const userId = await dependencies.authorize(request);
    await dependencies.checkLimit(request, `${userId}:spatial:service-area`);
    const parsed = serviceAreaRequestSchema.safeParse(await readBoundedJsonBody(request, 4_096));
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");

    const result = await dependencies.serviceArea(
      { ...parsed.data.origin, source: "EXPLICIT_ORIGIN" },
      parsed.data.max_minutes,
    );

    return createSuccessResponse(requestId, {
      ...result,
      source: "GETRA_PEDESTRIAN_NETWORK",
      analysis_method: "pgr_driving_distance",
    });
  });
  };
}

export const POST = createServiceAreaHandler();

export const OPTIONS = createOptionsHandler("/api/spatial/service-area");
