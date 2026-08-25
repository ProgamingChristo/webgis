import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityContributionService,
  SupabaseCommunityContributionRepository,
  type CommunityContribution,
} from "@/src/features/community-contributions";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityContributionDetailEndpointService = {
  getOwn(contributionId: unknown): Promise<CommunityContribution>;
};

type CommunityContributionDetailContext = {
  params: Promise<{
    contributionId: string;
  }>;
};

export type CommunityContributionDetailHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityContributionDetailEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityContributionDetailHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
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

export function createCommunityContributionDetailHandler(
  dependencies: CommunityContributionDetailHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CommunityContributionDetailContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:contributions:detail`,
      );

      const params = await context.params;
      const contribution = await dependencies
        .createService(request)
        .getOwn(params.contributionId);

      return createSuccessResponse(requestId, contribution);
    });
  };
}

export const GET = createCommunityContributionDetailHandler();
export const OPTIONS = createOptionsHandler(
  "/api/community/contributions/[contributionId]",
);
