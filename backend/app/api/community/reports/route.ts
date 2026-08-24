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

type CommunityReportsEndpointService = {
  createReport(input: unknown): ReturnType<CommunityService["createReport"]>;
};

export type CommunityReportsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityReportsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityReportsHandlerDependencies = {
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

export function createCommunityReportsHandler(
  dependencies: CommunityReportsHandlerDependencies = defaultDependencies,
) {
  return async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:reports:create`,
      );

      const body = await readBoundedJsonBody(
        request,
        MAX_PROFILE_JSON_BODY_BYTES,
      );
      const report = await dependencies.createService(request).createReport(body);

      return createSuccessResponse(requestId, report, {
        status: 201,
      });
    });
  };
}

export const POST = createCommunityReportsHandler();
export const OPTIONS = createOptionsHandler("/api/community/reports");
