import type { NextRequest } from "next/server";

import { checkRoutingProviderHealth } from "@/src/features/routing";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { getRequestId } from "@/src/lib/request-id";

export const runtime = "nodejs";
export const maxDuration = 10;

export interface RoutingProviderHealthDependencies {
  authorize: typeof requireAuthenticatedUser;
  checkHealth: typeof checkRoutingProviderHealth;
}

const dependencies: RoutingProviderHealthDependencies = {
  authorize: requireAuthenticatedUser,
  checkHealth: checkRoutingProviderHealth,
};

export function createRoutingProviderHealthHandler(
  overrides: RoutingProviderHealthDependencies = dependencies,
) {
  return async function handler(request: NextRequest) {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await overrides.authorize(request);
      const health = await overrides.checkHealth();
      return createSuccessResponse(requestId, health);
    });
  };
}

export const GET = createRoutingProviderHealthHandler();
export const OPTIONS = createOptionsHandler("/api/internal/routing/provider-health");
