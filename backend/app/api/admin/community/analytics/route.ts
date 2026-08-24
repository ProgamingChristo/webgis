import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireRole } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type AdminCommunityAnalyticsEndpointService = {
  getAnalytics(): ReturnType<CommunityService["getAnalytics"]>;
};

export type AdminCommunityAnalyticsHandlerDependencies = {
  authenticateAdmin(request: NextRequest): Promise<string>;
  createService(request: NextRequest): AdminCommunityAnalyticsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: AdminCommunityAnalyticsHandlerDependencies = {
  authenticateAdmin: async (request) =>
    (await requireRole(request, "ADMIN")).userId,
  createService: (request) => {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityService(
      new SupabaseCommunityRepository(
        getRequestSupabaseClient(authorization),
      ),
    );
  },
  rateLimiter,
};

export function createAdminCommunityAnalyticsHandler(
  dependencies: AdminCommunityAnalyticsHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticateAdmin(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:admin:community:analytics:get`,
      );

      const analytics = await dependencies.createService(request).getAnalytics();

      return createSuccessResponse(requestId, analytics);
    });
  };
}

export const GET = createAdminCommunityAnalyticsHandler();
export const OPTIONS = createOptionsHandler("/api/admin/community/analytics");
