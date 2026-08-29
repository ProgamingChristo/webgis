import type { NextRequest } from "next/server";

import {
  AccessibilityEvidenceRepository,
  AccessibilityEvidenceService,
  parseAccessibilityEvidenceId,
} from "@/src/features/accessibility-evidence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 20;

type Params = {
  params: Promise<{ evidenceId: string }>;
};

export function createAccessibilityEvidenceDetailHandler() {
  return async (request: NextRequest, context: Params) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await requireAuthenticatedUser(request);
      const { evidenceId } = await context.params;
      const id = parseAccessibilityEvidenceId(decodeURIComponent(evidenceId));
      const service = new AccessibilityEvidenceService(
        new AccessibilityEvidenceRepository(getServiceRoleSupabaseClient()),
      );
      return createSuccessResponse(requestId, await service.getDetail(id));
    });
  };
}

export const GET = createAccessibilityEvidenceDetailHandler();
export const OPTIONS = createOptionsHandler("/api/accessibility/evidence/[evidenceId]");
