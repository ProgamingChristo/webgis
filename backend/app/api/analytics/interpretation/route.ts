import type { NextRequest } from "next/server";
import {
  AnalyticsInterpretationService,
  analyticsInterpretationRequestSchema,
  DemandIntelligenceRepository,
  DemandIntelligenceService,
  parseAnalyticsSearchParams,
  type AnalyticsInterpretation,
  type AnalyticsQuery,
  type DemandIntelligenceResult,
} from "@/src/features/demand-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface InterpretationRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  analyze: (query: AnalyticsQuery) => Promise<DemandIntelligenceResult>;
  explain: (result: DemandIntelligenceResult, regionId: string) => Promise<AnalyticsInterpretation>;
}

const defaultDependencies: InterpretationRouteDependencies = {
  authorize: requireAuthenticatedUser,
  analyze: (query) => new DemandIntelligenceService(
    new DemandIntelligenceRepository(getServiceRoleSupabaseClient()),
  ).analyze(query),
  explain: (result, regionId) => new AnalyticsInterpretationService().explain(result, regionId),
};

export function createAnalyticsInterpretationHandler(
  dependencies: InterpretationRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await dependencies.authorize(request);
      const parsed = analyticsInterpretationRequestSchema.safeParse(
        await readBoundedJsonBody(request, 4_096),
      );
      if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
      const query = parseAnalyticsSearchParams(new URLSearchParams(parsed.data.query));
      const result = await dependencies.analyze(query);
      const interpretation = await dependencies.explain(result, parsed.data.region_id);
      return createSuccessResponse(requestId, interpretation);
    });
  };
}

export const POST = createAnalyticsInterpretationHandler();
export const OPTIONS = createOptionsHandler("/api/analytics/interpretation");
