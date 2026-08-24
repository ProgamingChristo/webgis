import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
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

type MarkAllNotificationsEndpointService = {
  markAllNotificationsRead(): ReturnType<CommunityService["markAllNotificationsRead"]>;
};

export type MarkAllNotificationsHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): MarkAllNotificationsEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: MarkAllNotificationsHandlerDependencies = {
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

export function createMarkAllNotificationsHandler(
  dependencies: MarkAllNotificationsHandlerDependencies = defaultDependencies,
) {
  return async function PATCH(request: NextRequest): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:notifications:mark-all-read`,
      );

      await dependencies.createService(request).markAllNotificationsRead();

      return createSuccessResponse(requestId, { ok: true });
    });
  };
}

export const PATCH = createMarkAllNotificationsHandler();
export const OPTIONS = createOptionsHandler("/api/community/notifications/read-all");
