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

type MarkNotificationReadEndpointService = {
  markNotificationRead(notificationId: unknown): ReturnType<CommunityService["markNotificationRead"]>;
};

type MarkNotificationReadContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export type MarkNotificationReadHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): MarkNotificationReadEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: MarkNotificationReadHandlerDependencies = {
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

export function createMarkNotificationReadHandler(
  dependencies: MarkNotificationReadHandlerDependencies = defaultDependencies,
) {
  return async function PATCH(
    request: NextRequest,
    context: MarkNotificationReadContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticate(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:community:notifications:mark-read`,
      );

      const params = await context.params;
      await dependencies
        .createService(request)
        .markNotificationRead(params.notificationId);

      return createSuccessResponse(requestId, { ok: true });
    });
  };
}

export const PATCH = createMarkNotificationReadHandler();
export const OPTIONS = createOptionsHandler(
  "/api/community/notifications/[notificationId]/read",
);
