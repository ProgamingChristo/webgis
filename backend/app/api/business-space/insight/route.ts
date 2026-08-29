import type { NextRequest } from "next/server";
import {
  businessSpaceInsightSchema,
  BusinessSpaceInsightService,
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
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    await requireAuthenticatedUser(request);
    const parsed = businessSpaceInsightSchema.safeParse(
      await readBoundedJsonBody(request, 10_240),
    );
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
    const service = new BusinessSpaceService(
      new BusinessSpaceRepository(getServiceRoleSupabaseClient()),
    );
    const comparison = await service.compare(parsed.data);
    const insight = await new BusinessSpaceInsightService().explain(
      comparison,
      parsed.data.question,
    );
    return createSuccessResponse(requestId, insight);
  });
}

export const OPTIONS = createOptionsHandler("/api/business-space/insight");
