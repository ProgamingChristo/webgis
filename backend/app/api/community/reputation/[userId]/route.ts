import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityReputationEndpointService = {
  getReputation(userId: unknown): ReturnType<CommunityService["getReputation"]>;
};

type CommunityReputationContext = {
  params: Promise<{
    userId: string;
  }>;
};

export type CommunityReputationHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityReputationEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityReputationHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
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

export function createCommunityReputationHandler(
  dependencies: CommunityReputationHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CommunityReputationContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:reputation:get`,
      );

      const params = await context.params;
      const reputation = await dependencies
        .createService(request)
        .getReputation(params.userId);

      return createSuccessResponse(requestId, reputation);
    });
  };
}

export const GET = createCommunityReputationHandler();
export const OPTIONS = createOptionsHandler(
  "/api/community/reputation/[userId]",
);
