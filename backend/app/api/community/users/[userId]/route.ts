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

type CommunityUserProfileEndpointService = {
  getCommunityUserProfile(userId: unknown): ReturnType<CommunityService["getCommunityUserProfile"]>;
};

type CommunityUserProfileContext = {
  params: Promise<{
    userId: string;
  }>;
};

export type CommunityUserProfileHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityUserProfileEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityUserProfileHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: (request) => {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityService(
      new SupabaseCommunityRepository(getRequestSupabaseClient(authorization)),
    );
  },
  rateLimiter,
};

export function createCommunityUserProfileHandler(
  dependencies: CommunityUserProfileHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CommunityUserProfileContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:users:profile`,
      );

      const params = await context.params;
      const profile = await dependencies
        .createService(request)
        .getCommunityUserProfile(params.userId);

      return createSuccessResponse(requestId, profile);
    });
  };
}

export const GET = createCommunityUserProfileHandler();
export const OPTIONS = createOptionsHandler("/api/community/users/[userId]");
