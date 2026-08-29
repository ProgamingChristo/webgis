import type { NextRequest } from "next/server";

import {
  parseContextualObservationRequest,
  type ContextualObservationQuery,
} from "@/src/features/contextual-observations/contextual-observation.schema";
import { ContextualObservationService } from "@/src/features/contextual-observations/contextual-observation.service";
import type { ContextualObservationResult } from "@/src/features/contextual-observations/contextual-observation.types";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

export interface ContextualObservationRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  list: (query: ContextualObservationQuery) => Promise<ContextualObservationResult>;
}

const defaultDependencies: ContextualObservationRouteDependencies = {
  authorize: requireAuthenticatedUser,
  list: (query) => new ContextualObservationService(
    new MapidMissionRepository(getServiceRoleSupabaseClient()),
  ).list(query),
};

export function createContextualObservationHandler(
  dependencies: ContextualObservationRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await dependencies.authorize(request);
      const query = parseContextualObservationRequest(request);
      return createSuccessResponse(requestId, await dependencies.list(query));
    });
  };
}

export const GET = createContextualObservationHandler();
export const OPTIONS = createOptionsHandler("/api/contextual-observations");
