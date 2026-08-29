import type { NextRequest } from "next/server";
import {
  parseUmkmIntelligenceQuery,
  UmkmIntelligenceRepository,
  UmkmIntelligenceService,
  type MerchantIntelligenceResult,
  type UmkmIntelligenceQuery,
} from "@/src/features/umkm-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface UmkmIntelligenceRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  analyze: (userId: string, query: UmkmIntelligenceQuery) => Promise<MerchantIntelligenceResult>;
}

const defaultDependencies: UmkmIntelligenceRouteDependencies = {
  authorize: requireAuthenticatedUser,
  analyze: (userId, query) => new UmkmIntelligenceService(
    new UmkmIntelligenceRepository(getServiceRoleSupabaseClient()),
  ).analyze(userId, query),
};

export function createUmkmIntelligenceHandler(
  dependencies: UmkmIntelligenceRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authorize(request);
      const query = parseUmkmIntelligenceQuery(request.nextUrl.searchParams);
      const result = await dependencies.analyze(userId, query);
      return createSuccessResponse(requestId, result);
    });
  };
}

export const GET = createUmkmIntelligenceHandler();
export const OPTIONS = createOptionsHandler("/api/umkm/intelligence");
