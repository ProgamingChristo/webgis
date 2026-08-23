import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommuterRequestItem,
  type CommuterRequestPage,
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

type CommunityRequestsEndpointService = {
  createCommuterRequest(
    authorId: string,
    input: unknown,
  ): Promise<CommuterRequestItem>;
  listCommuterRequests(input: unknown): Promise<CommuterRequestPage>;
};

export type CommunityRequestsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityRequestsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityRequestsHandlerDependencies = {
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

export function createCommunityRequestsHandlers(
  dependencies: CommunityRequestsHandlerDependencies = defaultDependencies,
) {
  return {
    GET: async function GET(request: NextRequest): Promise<NextResponse> {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        const userId = await dependencies.authenticate(request);
        await dependencies.rateLimiter.checkLimit(
          request,
          `${userId}:community:requests:list`,
        );

        const searchParams = Object.fromEntries(
          new URL(request.url).searchParams.entries(),
        );
        const result = await dependencies
          .createService(request)
          .listCommuterRequests(searchParams);

        return createListResponse(
          requestId,
          result.items,
          buildPaginationMeta(result.page, result.limit, result.total),
        );
      });
    },

    POST: async function POST(request: NextRequest): Promise<NextResponse> {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        const userId = await dependencies.authenticate(request);
        await dependencies.rateLimiter.checkLimit(
          request,
          `${userId}:community:requests:create`,
        );

        const body = await readBoundedJsonBody(
          request,
          MAX_PROFILE_JSON_BODY_BYTES,
        );
        const item = await dependencies
          .createService(request)
          .createCommuterRequest(userId, body);

        return createSuccessResponse(requestId, item, {
          status: 201,
        });
      });
    },
  };
}

const handlers = createCommunityRequestsHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const OPTIONS = createOptionsHandler("/api/community/requests");
