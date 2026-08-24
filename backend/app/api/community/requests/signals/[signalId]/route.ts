import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityDemandSignal,
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

type CommunityDemandSignalDetailEndpointService = {
  getDemandSignal(signalId: unknown): Promise<CommunityDemandSignal>;
};

type CommunityDemandSignalDetailContext = {
  params: Promise<{
    signalId: string;
  }>;
};

export type CommunityDemandSignalDetailHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityDemandSignalDetailEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityDemandSignalDetailHandlerDependencies = {
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

export function createCommunityDemandSignalDetailHandler(
  dependencies: CommunityDemandSignalDetailHandlerDependencies = defaultDependencies,
) {
  return async function GET(
    request: NextRequest,
    context: CommunityDemandSignalDetailContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:request-signals:detail`,
      );

      const params = await context.params;
      const item = await dependencies
        .createService(request)
        .getDemandSignal(params.signalId);

      return createSuccessResponse(requestId, item);
    });
  };
}

export const GET = createCommunityDemandSignalDetailHandler();
export const OPTIONS = createOptionsHandler(
  "/api/community/requests/signals/[signalId]",
);
