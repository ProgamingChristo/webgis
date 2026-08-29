import type { NextRequest } from "next/server";
import {
  businessSpaceDetailParamsSchema,
  BusinessSpaceRepository,
  BusinessSpaceService,
  parseBusinessSpaceCandidateQuery,
} from "@/src/features/business-space-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ candidateId: string }> },
) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () => {
    await requireAuthenticatedUser(request);
    const params = businessSpaceDetailParamsSchema.safeParse(await context.params);
    if (!params.success) throw new ApplicationError("VALIDATION_ERROR");
    const query = parseBusinessSpaceCandidateQuery(
      new URLSearchParams({
        region_id: request.nextUrl.searchParams.get("region_id") ?? "jakarta-selatan",
        category: request.nextUrl.searchParams.get("category") ?? "bakso",
        days: request.nextUrl.searchParams.get("days") ?? "30",
      }),
    );
    const service = new BusinessSpaceService(
      new BusinessSpaceRepository(getServiceRoleSupabaseClient()),
    );
    return createSuccessResponse(
      requestId,
      await service.getCandidateDetail(params.data.candidateId, query.category, query.days),
    );
  });
}

export const OPTIONS = createOptionsHandler("/api/business-space/candidates/[candidateId]");
