import type { NextRequest } from "next/server";

import { parseAdministrativeBoundaryRequest } from "@/src/features/administrative-boundaries/administrative-boundary.schema";
import { AdministrativeBoundaryService } from "@/src/features/administrative-boundaries/administrative-boundary.service";
import type { AdministrativeBoundaryCollection } from "@/src/features/administrative-boundaries/administrative-boundary.types";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export interface AdministrativeBoundaryRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  getBoundaries: (ids: string[]) => Promise<AdministrativeBoundaryCollection>;
}

const defaultDependencies: AdministrativeBoundaryRouteDependencies = {
  authorize: requireAuthenticatedUser,
  getBoundaries: (ids) => new AdministrativeBoundaryService(
    getServiceRoleSupabaseClient(),
  ).getByIds(ids),
};

export function createAdministrativeBoundaryHandler(
  dependencies: AdministrativeBoundaryRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await dependencies.authorize(request);
      const query = parseAdministrativeBoundaryRequest(request);
      const featureCollection = await dependencies.getBoundaries(query.ids);
      return createSuccessResponse(requestId, {
        feature_collection: featureCollection,
        feature_count: featureCollection.features.length,
      });
    });
  };
}

export const GET = createAdministrativeBoundaryHandler();
export const OPTIONS = createOptionsHandler("/api/regions");
