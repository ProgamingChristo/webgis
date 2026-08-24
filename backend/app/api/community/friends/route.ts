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

type CommunityFriendsEndpointService = {
  listFriendships(input: unknown): ReturnType<CommunityService["listFriendships"]>;
};

export type CommunityFriendsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityFriendsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityFriendsHandlerDependencies = {
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

export function createCommunityFriendsHandler(
  dependencies: CommunityFriendsHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:friends:list`,
      );

      const result = await dependencies
        .createService(request)
        .listFriendships(
          Object.fromEntries(request.nextUrl.searchParams.entries()),
        );

      return createSuccessResponse(requestId, result);
    });
  };
}

export const GET = createCommunityFriendsHandler();
export const OPTIONS = createOptionsHandler("/api/community/friends");
