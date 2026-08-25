import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityContributionService,
  SupabaseCommunityContributionRepository,
  type CommunityContributionModerationDetail,
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

type AdminCommunityContributionDetailEndpointService = {
  getModerationDetail(
    contributionId: unknown,
  ): Promise<CommunityContributionModerationDetail>;
};

type AdminCommunityContributionDetailContext = {
  params: Promise<{
    contributionId: string;
  }>;
};

export type AdminCommunityContributionDetailHandlerDependencies = {
  authenticateAdmin(request: NextRequest): Promise<string>;
  createService(
    request: NextRequest,
  ): AdminCommunityContributionDetailEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: AdminCommunityContributionDetailHandlerDependencies = {
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

export function createAdminCommunityContributionDetailHandler(
  dependencies: AdminCommunityContributionDetailHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: AdminCommunityContributionDetailContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticateAdmin(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:admin:community:contributions:detail`,
      );

      const params = await context.params;
      const contribution = await dependencies
        .createService(request)
        .getModerationDetail(params.contributionId);

      return createSuccessResponse(requestId, contribution);
    });
  };
}

export const GET = createAdminCommunityContributionDetailHandler();
export const OPTIONS = createOptionsHandler(
  "/api/admin/community/contributions/[contributionId]",
);
