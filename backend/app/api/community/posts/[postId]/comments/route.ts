import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityComment,
  type CommunityCommentPage,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import {
  createListResponse,
  createSuccessResponse,
} from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { MAX_PROFILE_JSON_BODY_BYTES, readBoundedJsonBody } from "@/src/lib/request-body";
import { buildPaginationMeta } from "@/src/lib/pagination";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityCommentsEndpointService = {
  listComments(
    postId: unknown,
    input: unknown,
  ): Promise<CommunityCommentPage>;
  createComment(
    authorId: string,
    postId: unknown,
    input: unknown,
  ): Promise<CommunityComment>;
};

export type CommunityCommentsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityCommentsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityCommentsHandlerDependencies = {
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

export function createCommunityCommentsHandlers(
  dependencies: CommunityCommentsHandlerDependencies = defaultDependencies,
) {
  return {
    GET: async (
      request: NextRequest,
      context: { params: Promise<{ postId: string }> },
    ): Promise<NextResponse> => {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        const userId = await dependencies.authenticate(request);
        await dependencies.rateLimiter.checkLimit(
          request,
          `${userId}:community:comments:list`,
        );

        const { postId } = await context.params;
        const searchParams = Object.fromEntries(
          new URL(request.url).searchParams.entries(),
        );
        const result = await dependencies
          .createService(request)
          .listComments(postId, searchParams);

        return createListResponse(
          requestId,
          result.items,
          buildPaginationMeta(result.page, result.limit, result.total),
        );
      });
    },
    POST: async (
      request: NextRequest,
      context: { params: Promise<{ postId: string }> },
    ): Promise<NextResponse> => {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        const userId = await dependencies.authenticate(request);
        await dependencies.rateLimiter.checkLimit(
          request,
          `${userId}:community:comments:create`,
        );

        const { postId } = await context.params;
        const body = await readBoundedJsonBody(
          request,
          MAX_PROFILE_JSON_BODY_BYTES,
        );
        const comment = await dependencies
          .createService(request)
          .createComment(userId, postId, body);

        return createSuccessResponse(requestId, comment, {
          status: 201,
        });
      });
    },
  };
}

const handlers = createCommunityCommentsHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const OPTIONS = createOptionsHandler(
  "/api/community/posts/[postId]/comments",
);
