import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireRole } from "@/src/lib/auth";
import {
  MAX_PROFILE_JSON_BODY_BYTES,
  readBoundedJsonBody,
} from "@/src/lib/request-body";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type AdminCommunityModerationEndpointService = {
  moderateReport(
    reportId: unknown,
    input: unknown,
  ): ReturnType<CommunityService["moderateReport"]>;
};

type AdminCommunityModerationContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export type AdminCommunityModerationHandlerDependencies = {
  authenticateAdmin(request: NextRequest): Promise<string>;
  createService(request: NextRequest): AdminCommunityModerationEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: AdminCommunityModerationHandlerDependencies = {
  authenticateAdmin: async (request) =>
    (await requireRole(request, "ADMIN")).userId,
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

export function createAdminCommunityModerationHandler(
  dependencies: AdminCommunityModerationHandlerDependencies = defaultDependencies,
) {
  return async function PATCH(
    request: NextRequest,
    context: AdminCommunityModerationContext,
  ): Promise<NextResponse> {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authenticateAdmin(request);
      await dependencies.rateLimiter.checkLimit(
        request,
        `${userId}:admin:community:reports:moderate`,
      );

      const params = await context.params;
      const body = await readBoundedJsonBody(
        request,
        MAX_PROFILE_JSON_BODY_BYTES,
      );
      await dependencies
        .createService(request)
        .moderateReport(params.reportId, body);

      return createSuccessResponse(requestId, { ok: true });
    });
  };
}

export const PATCH = createAdminCommunityModerationHandler();
export const OPTIONS = createOptionsHandler(
  "/api/admin/community/reports/[reportId]",
);
