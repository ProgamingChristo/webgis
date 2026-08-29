import type { NextRequest } from "next/server";

import {
  AccessibilityEvidenceRepository,
  AccessibilityEvidenceService,
  parseAccessibilityEvidenceQuery,
} from "@/src/features/accessibility-evidence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 20;

export function createAccessibilityEvidenceHandler() {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await requireAuthenticatedUser(request);
      const query = parseAccessibilityEvidenceQuery(request);
      const service = new AccessibilityEvidenceService(
        new AccessibilityEvidenceRepository(getServiceRoleSupabaseClient()),
      );
      return createSuccessResponse(requestId, await service.list(query));
    });
  };
}

export const GET = createAccessibilityEvidenceHandler();
export const OPTIONS = createOptionsHandler("/api/accessibility/evidence");
