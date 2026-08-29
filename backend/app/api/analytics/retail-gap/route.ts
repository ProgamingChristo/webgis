import type { NextRequest } from "next/server";
import {
  DemandIntelligenceRepository,
  DemandIntelligenceService,
  parseAnalyticsSearchParams,
  type AnalyticsQuery,
  type DemandIntelligenceResult,
} from "@/src/features/demand-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

export interface RetailGapRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  analyze: (query: AnalyticsQuery) => Promise<DemandIntelligenceResult>;
}

const defaultDependencies: RetailGapRouteDependencies = {
  authorize: requireAuthenticatedUser,
  analyze: (query) => new DemandIntelligenceService(
    new DemandIntelligenceRepository(getServiceRoleSupabaseClient()),
  ).analyze(query),
};

export function createRetailGapHandler(
  dependencies: RetailGapRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await dependencies.authorize(request);
      const query = parseAnalyticsSearchParams(request.nextUrl.searchParams);
      const result = await dependencies.analyze(query);
      return createSuccessResponse(requestId, { mode: "RETAIL_GAP", ...result });
    });
  };
}

export const GET = createRetailGapHandler();
export const OPTIONS = createOptionsHandler("/api/analytics/retail-gap");
