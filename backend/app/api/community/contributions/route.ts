import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityContributionService,
  SupabaseCommunityContributionRepository,
  type CommunityContribution,
  type CommunityContributionHistoryResult,
} from "@/src/features/community-contributions";
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

type CommunityContributionEndpointService = {
  create(authorId: string, input: unknown): Promise<CommunityContribution>;
  listOwnHistory(input: unknown): Promise<CommunityContributionHistoryResult>;
};

export type CommunityContributionsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityContributionEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityContributionsHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: (request) => {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityContributionService(
      new SupabaseCommunityContributionRepository(
        getRequestSupabaseClient(authorization),
      ),
    );
  },
  rateLimiter,
};

export function createCommunityContributionsHandler(
  dependencies: CommunityContributionsHandlerDependencies = defaultDependencies,
) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:contributions:create`,
      );

      const body = await readBoundedJsonBody(
        request,
        MAX_PROFILE_JSON_BODY_BYTES,
      );
      const contribution = await dependencies
        .createService(request)
        .create(userId, body);

      return createSuccessResponse(requestId, contribution, {
        status: 201,
      });
    });
  };
}

export function createCommunityContributionHistoryHandler(
  dependencies: CommunityContributionsHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:contributions:history`,
      );

      const history = await dependencies.createService(request).listOwnHistory({
        page: request.nextUrl.searchParams.get("page") ?? undefined,
        limit: request.nextUrl.searchParams.get("limit") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        report_type:
          request.nextUrl.searchParams.get("report_type") ?? undefined,
      });

      return createSuccessResponse(requestId, history);
    });
  };
}

export const POST = createCommunityContributionsHandler();
export const GET = createCommunityContributionHistoryHandler();
export const OPTIONS = createOptionsHandler("/api/community/contributions");
