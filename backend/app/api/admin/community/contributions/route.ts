import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityContributionService,
  SupabaseCommunityContributionRepository,
  type CommunityContributionModerationResult,
} from "@/src/features/community-contributions";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireRole } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type AdminCommunityContributionsEndpointService = {
  listModerationQueue(
    input: unknown,
  ): Promise<CommunityContributionModerationResult>;
};

export type AdminCommunityContributionsHandlerDependencies = {
  authenticateAdmin(request: NextRequest): Promise<string>;
  createService(request: NextRequest): AdminCommunityContributionsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: AdminCommunityContributionsHandlerDependencies = {
  authenticateAdmin: async (request) =>
    (await requireRole(request, "ADMIN")).userId,
  createService: (request) => {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityContributionService(
      new SupabaseCommunityContributionRepository(
        getRequestSupabaseClient(authorization),
      ),
    );
  },
  rateLimiter,
};

export function createAdminCommunityContributionsHandler(
  dependencies: AdminCommunityContributionsHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticateAdmin(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:admin:community:contributions:list`,
      );

      const result = await dependencies.createService(request).listModerationQueue({
        page: request.nextUrl.searchParams.get("page") ?? undefined,
        limit: request.nextUrl.searchParams.get("limit") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        report_type:
          request.nextUrl.searchParams.get("report_type") ?? undefined,
      });

      return createSuccessResponse(requestId, result);
    });
  };
}

export const GET = createAdminCommunityContributionsHandler();
export const OPTIONS = createOptionsHandler("/api/admin/community/contributions");
