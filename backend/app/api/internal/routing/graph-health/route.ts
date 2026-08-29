import type { NextRequest } from "next/server";

import { CommuterNetworkRepository } from "@/src/features/commuter";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

export interface GraphHealthRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  graphHealth: CommuterNetworkRepository["graphHealth"];
}

const graphHealthDependencies: GraphHealthRouteDependencies = {
  authorize: requireAuthenticatedUser,
  graphHealth: () => new CommuterNetworkRepository(
    getServiceRoleSupabaseClient(),
  ).graphHealth(),
};

export function createGraphHealthHandler(
  dependencies: GraphHealthRouteDependencies = graphHealthDependencies,
) {
  return async function handler(request: NextRequest) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    await dependencies.authorize(request);
    const health = await dependencies.graphHealth();
    return createSuccessResponse(requestId, health);
  });
  };
}

export const GET = createGraphHealthHandler();

export const OPTIONS = createOptionsHandler("/api/internal/routing/graph-health");
