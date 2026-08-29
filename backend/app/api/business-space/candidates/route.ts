import type { NextRequest } from "next/server";
import {
  BusinessSpaceRepository,
  BusinessSpaceService,
  parseBusinessSpaceCandidateQuery,
} from "@/src/features/business-space-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export function createBusinessSpaceCandidatesHandler() {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      await requireAuthenticatedUser(request);
      const query = parseBusinessSpaceCandidateQuery(request.nextUrl.searchParams);
      const service = new BusinessSpaceService(
        new BusinessSpaceRepository(getServiceRoleSupabaseClient()),
      );
      return createSuccessResponse(requestId, await service.listCandidates(query));
    });
  };
}

export const GET = createBusinessSpaceCandidatesHandler();
export const OPTIONS = createOptionsHandler("/api/business-space/candidates");
