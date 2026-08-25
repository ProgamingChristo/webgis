import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityContributionService,
  SupabaseCommunityContributionRepository,
  type CommunityContributionMapFeature,
} from "@/src/features/community-contributions";
import { withApiLogger } from "@/src/lib/api-logger";
import { createListResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityContributionMapEndpointService = {
  listMapFeatures(input: unknown): Promise<CommunityContributionMapFeature[]>;
};

export type CommunityContributionMapHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityContributionMapEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityContributionMapHandlerDependencies = {
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

export function createCommunityContributionMapHandler(
  dependencies: CommunityContributionMapHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:contributions:map`,
      );

      const searchParams = request.nextUrl.searchParams;
      const items = await dependencies.createService(request).listMapFeatures({
        min_lng: searchParams.get("min_lng") ?? undefined,
        min_lat: searchParams.get("min_lat") ?? undefined,
        max_lng: searchParams.get("max_lng") ?? undefined,
        max_lat: searchParams.get("max_lat") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
      });

      return createListResponse(requestId, items, {
        page: 1,
        limit: items.length,
        total: items.length,
        total_pages: 1,
      });
    });
  };
}

export const GET = createCommunityContributionMapHandler();
export const OPTIONS = createOptionsHandler("/api/community/contributions/map");
