import { NextRequest } from "next/server";

import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireRole } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { mapidMissionSyncRequestSchema } from "@/src/integrations/mapid/mission.schema";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import { MapidMissionSyncService } from "@/src/integrations/mapid/mission.service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  return withApiLogger(request, requestId, async () => {
    const { userId } = await requireRole(request, "ADMIN");
    const body = await readBoundedJsonBody(request, 131_072);
    const input = mapidMissionSyncRequestSchema.parse(body);

    const repository = new MapidMissionRepository(getServiceRoleSupabaseClient());
    const service = new MapidMissionSyncService(repository);

    const reports = [];
    for (const source of input.sources) {
      reports.push(
        await service.syncSource({
          createdBy: userId,
          feature: input.feature,
          maxPages: input.max_pages,
          offset: input.offset,
          pageSize: input.page_size,
          source,
        }),
      );
    }

    return createSuccessResponse(requestId, {
      reports,
      status: reports.every((report) => report.status === "COMPLETED")
        ? "COMPLETED"
        : "PARTIAL",
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/admin/mapid/mission-sync");
