import type { NextRequest } from "next/server";

import {
  AccessibilityEvidenceRepository,
  AccessibilityEvidenceService,
  accessibilityReviewRequestSchema,
  parseAccessibilityEvidenceId,
} from "@/src/features/accessibility-evidence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireRole } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = {
  params: Promise<{ evidenceId: string }>;
};

type AdminAccessibilityReviewRouteService = Pick<
  AccessibilityEvidenceService,
  "review"
>;

export interface AdminAccessibilityEvidenceReviewDependencies {
  authorize: typeof requireRole;
  createService: (authorization: string) => AdminAccessibilityReviewRouteService;
}

const defaultDependencies: AdminAccessibilityEvidenceReviewDependencies = {
  authorize: requireRole,
  createService: (authorization) =>
    new AccessibilityEvidenceService(
      new AccessibilityEvidenceRepository(getRequestSupabaseClient(authorization)),
    ),
};

export function createAdminAccessibilityEvidenceReviewHandler(
  dependencies: AdminAccessibilityEvidenceReviewDependencies = defaultDependencies,
) {
  return async (request: NextRequest, context: Params) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await dependencies.authorize(request, "ADMIN");
      const authorization = request.headers.get("Authorization");
      if (!authorization) throw new ApplicationError("UNAUTHORIZED");
      const { evidenceId } = await context.params;
      const id = parseAccessibilityEvidenceId(decodeURIComponent(evidenceId));
      const body = await readBoundedJsonBody(request, 8_192);
      const parsed = accessibilityReviewRequestSchema.safeParse(body);
      if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
      const service = dependencies.createService(authorization);
      return createSuccessResponse(requestId, await service.review(id, parsed.data));
    });
  };
}

export const POST = createAdminAccessibilityEvidenceReviewHandler();
export const OPTIONS = createOptionsHandler(
  "/api/admin/accessibility/evidence/[evidenceId]/review",
);
