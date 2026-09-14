import { NextRequest } from "next/server";
import { z } from "zod";

import { AdminMissionSyncService } from "@/src/integrations/mapid/mission-admin.service";
import { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import { mapidMissionSourceSchema } from "@/src/integrations/mapid/mission.schema";
import { MapidMissionSyncService } from "@/src/integrations/mapid/mission.service";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireRole } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

const adminMissionSyncRequestSchema = z
  .object({
    source: mapidMissionSourceSchema,
  })
  .strict();

type AdminMissionSyncRouteService = Pick<AdminMissionSyncService, "listLatest" | "sync">;

export interface AdminMissionSyncRouteDependencies {
  authorize: typeof requireRole;
  createService: () => AdminMissionSyncRouteService;
}

const defaultDependencies: AdminMissionSyncRouteDependencies = {
  authorize: requireRole,
  createService: () => {
    const repository = new MapidMissionRepository(getServiceRoleSupabaseClient());
    return new AdminMissionSyncService(
      repository,
      {
        syncSource: async (input) => {
          try {
            return await new MapidMissionSyncService(repository).syncSource(input);
          } catch (error) {
            if (error instanceof MapidError && error.code === "MAPID_CONFIGURATION_ERROR") {
              return {
                error: "Mission source configuration is unavailable.",
                failed: 1,
                finished_at: new Date().toISOString(),
                inserted: 0,
                invalid: 0,
                pages_fetched: 0,
                records_fetched: 0,
                skipped: 0,
                source: input.source,
                started_at: new Date().toISOString(),
                status: "BLOCKED",
                updated: 0,
              };
            }
            throw error;
          }
        },
      },
    );
  },
};

export function createAdminMissionSyncHandlers(
  dependencies: AdminMissionSyncRouteDependencies = defaultDependencies,
) {
  return {
    GET: async (request: NextRequest) => {
      const requestId = getRequestId(request);

      return withApiLogger(request, requestId, async () => {
        await dependencies.authorize(request, "ADMIN");
        const sources = await dependencies.createService().listLatest();
        return createSuccessResponse(requestId, { sources });
      });
    },
    POST: async (request: NextRequest) => {
      const requestId = getRequestId(request);

      return withApiLogger(request, requestId, async () => {
        const { userId } = await dependencies.authorize(request, "ADMIN");
        const body = await readBoundedJsonBody(request, 4_096);
        const parsed = adminMissionSyncRequestSchema.safeParse(body);

        if (!parsed.success) {
          throw new ApplicationError("VALIDATION_ERROR");
        }

        const result = await dependencies.createService().sync(
          parsed.data.source,
          userId,
        );
        return createSuccessResponse(requestId, result);
      });
    },
  };
}

const handlers = createAdminMissionSyncHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const OPTIONS = createOptionsHandler("/api/admin/mission/sync");
