import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityReactionSummary,
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

type CommunityReactionEndpointService = {
  addReaction(
    postId: unknown,
    reactionType: unknown,
  ): Promise<CommunityReactionSummary>;
  removeReaction(
    postId: unknown,
    reactionType: unknown,
  ): Promise<CommunityReactionSummary>;
};

export type CommunityReactionHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityReactionEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityReactionHandlerDependencies = {
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

type ReactionContext = {
  params: Promise<{
    postId: string;
    reactionType: string;
  }>;
};

export function createCommunityReactionHandlers(
  dependencies: CommunityReactionHandlerDependencies = defaultDependencies,
) {
  async function handleReaction(
    request: NextRequest,
    context: ReactionContext,
    action: "add" | "remove",
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:reactions:${action}`,
      );

      const { postId, reactionType } = await context.params;
      const service = dependencies.createService(request);
      const summary =
        action === "add"
          ? await service.addReaction(postId, reactionType)
          : await service.removeReaction(postId, reactionType);

      return createSuccessResponse(requestId, summary);
    });
  }

  return {
    PUT: (request: NextRequest, context: ReactionContext) =>
      handleReaction(request, context, "add"),
    DELETE: (request: NextRequest, context: ReactionContext) =>
      handleReaction(request, context, "remove"),
  };
}

const handlers = createCommunityReactionHandlers();

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
export const OPTIONS = createOptionsHandler(
  "/api/community/posts/[postId]/reactions/[reactionType]",
);
