import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import {
  MAX_PROFILE_JSON_BODY_BYTES,
  readBoundedJsonBody,
} from "@/src/lib/request-body";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityFriendshipActionEndpointService = {
  actOnFriendship(
    friendshipId: unknown,
    input: unknown,
  ): ReturnType<CommunityService["actOnFriendship"]>;
};

type CommunityFriendshipActionContext = {
  params: Promise<{
    friendshipId: string;
  }>;
};

export type CommunityFriendshipActionHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityFriendshipActionEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityFriendshipActionHandlerDependencies = {
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

export function createCommunityFriendshipActionHandler(
  dependencies: CommunityFriendshipActionHandlerDependencies = defaultDependencies,
) {
  return async function PATCH(
    request: NextRequest,
    context: CommunityFriendshipActionContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:friends:action`,
      );

      const params = await context.params;
      const body = await readBoundedJsonBody(
        request,
        MAX_PROFILE_JSON_BODY_BYTES,
      );
      await dependencies
        .createService(request)
        .actOnFriendship(params.friendshipId, body);

      return createSuccessResponse(requestId, { ok: true });
    });
  };
}

export const PATCH = createCommunityFriendshipActionHandler();
export const OPTIONS = createOptionsHandler("/api/community/friends/[friendshipId]");
