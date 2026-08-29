import type { NextRequest } from "next/server";

import { parseGlobalSearchRequest, type GlobalSearchQuery } from "@/src/features/global-search/global-search.schema";
import { GlobalSearchService } from "@/src/features/global-search/global-search.service";
import { AnalyticsEventService } from "@/src/features/demand-intelligence";
import type { GlobalSearchResult } from "@/src/features/global-search/global-search.types";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface CanonicalMerchantRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  search: (query: GlobalSearchQuery) => Promise<GlobalSearchResult>;
  recordSearch?: (actorId: string, result: GlobalSearchResult) => Promise<void>;
}

const defaultDependencies: CanonicalMerchantRouteDependencies = {
  authorize: requireAuthenticatedUser,
  search: (query) => new GlobalSearchService(
    getServiceRoleSupabaseClient(),
  ).search(query),
  recordSearch: (actorId, result) => new AnalyticsEventService(
    getServiceRoleSupabaseClient(),
  ).recordSearch(actorId, result),
};

export function createCanonicalMerchantHandler(
  dependencies: CanonicalMerchantRouteDependencies = defaultDependencies,
) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authorize(request);
      const query = parseGlobalSearchRequest(request);
      const result = await dependencies.search(query);
      await dependencies.recordSearch?.(userId, result);
      const hasMore = result.offset + result.merchants.length < result.total;
      return createSuccessResponse(requestId, {
        layer_id: "getra-canonical-merchants",
        layer_name: "GETRA canonical merchants",
        source: "GETRA canonical reconciliation",
        total_features: result.merchants.length,
        total_available: result.total,
        limit: result.limit,
        offset: result.offset,
        has_more: hasMore,
        next_offset: hasMore ? result.offset + result.merchants.length : null,
        bbox: result.intent.scope.bounds,
        intent: result.intent,
        regions: result.regions,
        available_regions: result.available_regions,
        merchants: result.merchants,
        commuter: result.commuter,
      });
    });
  };
}

export const GET = createCanonicalMerchantHandler();
export const OPTIONS = createOptionsHandler("/api/merchants/canonical");
