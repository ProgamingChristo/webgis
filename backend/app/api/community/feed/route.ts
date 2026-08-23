import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityFeedPage,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createListResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { buildPaginationMeta } from "@/src/lib/pagination";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import {
  getRequestSupabaseClient,
  getServiceRoleSupabaseClient,
} from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityFeedEndpointService = {
  listFeed(input: unknown): Promise<CommunityFeedPage>;
};

export type CommunityFeedHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityFeedEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityFeedHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: (request) => {
    const authorization =
      request.headers.get("Authorization");

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

export function createCommunityFeedHandler(
  dependencies: CommunityFeedHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:feed`,
      );

      const searchParams = Object.fromEntries(
        new URL(request.url).searchParams.entries(),
      );
      const result = await dependencies
        .createService(request)
        .listFeed(searchParams);

      return createListResponse(
        requestId,
        result.items,
        buildPaginationMeta(result.page, result.limit, result.total),
      );
    });
  };
}

export const GET = createCommunityFeedHandler();
export const OPTIONS = createOptionsHandler("/api/community/feed");
