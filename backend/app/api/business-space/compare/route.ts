import type { NextRequest } from "next/server";
import {
  businessSpaceComparisonSchema,
  BusinessSpaceRepository,
  BusinessSpaceService,
} from "@/src/features/business-space-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    await requireAuthenticatedUser(request);
    const parsed = businessSpaceComparisonSchema.safeParse(
      await readBoundedJsonBody(request, 8_192),
    );
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
    const service = new BusinessSpaceService(
      new BusinessSpaceRepository(getServiceRoleSupabaseClient()),
    );
    return createSuccessResponse(requestId, await service.compare(parsed.data));
  });
}

export const OPTIONS = createOptionsHandler("/api/business-space/compare");
