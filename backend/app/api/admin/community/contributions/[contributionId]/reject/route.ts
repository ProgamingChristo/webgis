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
import {
  MAX_PROFILE_JSON_BODY_BYTES,
  readBoundedJsonBody,
} from "@/src/lib/request-body";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type AdminCommunityContributionRejectEndpointService = {
  reject(
    contributionId: unknown,
    input: unknown,
  ): Promise<CommunityContributionModerationDetail>;
};

type AdminCommunityContributionRejectContext = {
  params: Promise<{
    contributionId: string;
  }>;
};

export type AdminCommunityContributionRejectHandlerDependencies = {
  authenticateAdmin(request: NextRequest): Promise<string>;
  createService(request: NextRequest): AdminCommunityContributionRejectEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: AdminCommunityContributionRejectHandlerDependencies = {
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

export function createAdminCommunityContributionRejectHandler(
  dependencies: AdminCommunityContributionRejectHandlerDependencies = defaultDependencies,
) {
  return async function POST(
    request: NextRequest,
    context: AdminCommunityContributionRejectContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticateAdmin(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:admin:community:contributions:reject`,
      );

      const params = await context.params;
      const body = await readBoundedJsonBody(
        request,
        MAX_PROFILE_JSON_BODY_BYTES,
      );
      const contribution = await dependencies
        .createService(request)
        .reject(params.contributionId, body);

      return createSuccessResponse(requestId, contribution);
    });
  };
}

export const POST = createAdminCommunityContributionRejectHandler();
export const OPTIONS = createOptionsHandler(
  "/api/admin/community/contributions/[contributionId]/reject",
);
