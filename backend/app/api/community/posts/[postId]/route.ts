import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityFeedItem,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import {
  getRequestSupabaseClient,
  getServiceRoleSupabaseClient,
} from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityPostDetailEndpointService = {
  getPost(postId: unknown): Promise<CommunityFeedItem>;
  deletePost(postId: unknown): Promise<{ deletionActorRole: "OWNER" | "ADMIN" }>;
};

export type CommunityPostDetailHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityPostDetailEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityPostDetailHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: (request) => {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityService(
      new SupabaseCommunityRepository(
        getRequestSupabaseClient(authorization),
        getServiceRoleSupabaseClient(),
      ),
    );
  },
  rateLimiter,
};

export function createCommunityPostDetailHandler(
  dependencies: CommunityPostDetailHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: { params: Promise<{ postId: string }> },
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:posts:detail`,
      );

      const { postId } = await context.params;
      const post = await dependencies
        .createService(request)
        .getPost(postId);

      return createSuccessResponse(requestId, post);
    });
  };
}

export const GET = createCommunityPostDetailHandler();
export function createCommunityPostDeleteHandler(
  dependencies: CommunityPostDetailHandlerDependencies = defaultDependencies,
) {
  return async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ postId: string }> },
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(request, `${userId}:community:posts:delete`);
      const { postId } = await context.params;
      const result = await dependencies.createService(request).deletePost(postId);
      return createSuccessResponse(requestId, result);
    });
  };
}

export const DELETE = createCommunityPostDeleteHandler();
export const OPTIONS = createOptionsHandler("/api/community/posts/[postId]");
