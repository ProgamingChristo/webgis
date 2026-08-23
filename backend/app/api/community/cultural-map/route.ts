import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityCulturalMapItem,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createListResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityCulturalMapEndpointService = {
  listCulturalMap(input: unknown): Promise<CommunityCulturalMapItem[]>;
};

export type CommunityCulturalMapHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityCulturalMapEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityCulturalMapHandlerDependencies = {
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

export function createCommunityCulturalMapHandler(
  dependencies: CommunityCulturalMapHandlerDependencies = defaultDependencies,
) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:cultural-map`,
      );

      const searchParams = new URL(request.url).searchParams;
      const categories = searchParams.getAll("categories");
      const query = {
        ...Object.fromEntries(searchParams.entries()),
        ...(categories.length > 0 ? { categories } : {}),
      };
      const items = await dependencies
        .createService(request)
        .listCulturalMap(query);

      return createListResponse(requestId, items, {
        page: 1,
        limit: items.length,
        total: items.length,
        total_pages: 1,
      });
    });
  };
}

export const GET = createCommunityCulturalMapHandler();
export const OPTIONS = createOptionsHandler("/api/community/cultural-map");
