import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommuterRequestItem,
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

type CommunityRequestDetailEndpointService = {
  getCommuterRequest(requestId: unknown): Promise<CommuterRequestItem>;
};

type CommunityRequestDetailContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export type CommunityRequestDetailHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityRequestDetailEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityRequestDetailHandlerDependencies = {
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

export function createCommunityRequestDetailHandler(
  dependencies: CommunityRequestDetailHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CommunityRequestDetailContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:requests:detail`,
      );

      const params = await context.params;
      const item = await dependencies
        .createService(request)
        .getCommuterRequest(params.requestId);

      return createSuccessResponse(requestId, item);
    });
  };
}

export const GET = createCommunityRequestDetailHandler();
export const OPTIONS = createOptionsHandler("/api/community/requests/[requestId]");
