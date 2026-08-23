import type {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  z,
} from "zod";

import {
  createOptionsHandler,
} from "@/src/lib/api-security";
import {
  createSuccessResponse,
} from "@/src/lib/api-response";
import {
  requireRole,
} from "@/src/lib/auth";
import {
  ApplicationError,
} from "@/src/lib/errors";
import {
  withApiLogger,
} from "@/src/lib/api-logger";
import {
  rateLimiter,
} from "@/src/lib/rate-limit";
import {
  getRequestId,
} from "@/src/lib/request-id";
import {
  getServiceRoleSupabaseClient,
} from "@/src/lib/supabase/server";
import {
  validateBody,
} from "@/src/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_LAYER_UPDATE_BODY_BYTES =
  8_192;

const layerUpdateSchema =
  z.object({
    layer_name:
      z.string().trim().min(1).max(120),
  }).strict();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId =
    getRequestId(request);

  return withApiLogger(
    request,
    requestId,
    async () => {
      const admin =
        await requireRole(
          request,
          "ADMIN",
        );

      await rateLimiter.checkLimit(
        request,
        `${admin.userId}:admin:map-import-update`,
      );

      const {
        id,
      } =
        await context.params;

      assertLayerId(id);

      const payload =
        await validateBody(
          request,
          layerUpdateSchema,
          MAX_LAYER_UPDATE_BODY_BYTES,
        );

      const supabase =
        getServiceRoleSupabaseClient();

      const [merchantResult, studyAreaResult] =
        await Promise.all([
          supabase
            .from("merchants")
            .select("id,metadata")
            .contains("metadata", {
              admin_map_import: true,
              import_batch_id: id,
            })
            .range(0, 4_999),
          supabase
            .from("study_areas")
            .select("id,metadata")
            .contains("metadata", {
              admin_map_import: true,
              import_batch_id: id,
            })
            .range(0, 499),
        ]);

      if (
        merchantResult.error ||
        studyAreaResult.error
      ) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Layer import belum dapat dibaca untuk update.",
          true,
        );
      }

      const merchants =
        merchantResult.data ?? [];
      const studyAreas =
        studyAreaResult.data ?? [];

      if (
        merchants.length === 0 &&
        studyAreas.length === 0
      ) {
        throw new ApplicationError(
          "NOT_FOUND",
          "Layer import tidak ditemukan.",
        );
      }

      const merchantUpdates =
        await Promise.all(
          merchants.map((row) =>
            supabase
              .from("merchants")
              .update({
                metadata: {
                  ...asRecord(row.metadata),
                  layer_name:
                    payload.layer_name,
                },
              })
              .eq("id", row.id),
          ),
        );

      const studyAreaUpdates =
        await Promise.all(
          studyAreas.map((row) => {
            const metadata =
              asRecord(row.metadata);
            const regionName =
              readString(
                metadata.region_name,
              ) || "Wilayah import";

            return supabase
              .from("study_areas")
              .update({
                name:
                  `${payload.layer_name} - ${regionName}`,
                metadata: {
                  ...metadata,
                  layer_name:
                    payload.layer_name,
                },
              })
              .eq("id", row.id);
          }),
        );

      if (
        [...merchantUpdates, ...studyAreaUpdates].some(
          (result) => result.error,
        )
      ) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Sebagian data layer import gagal diperbarui.",
          true,
        );
      }

      return createSuccessResponse(
        requestId,
        {
          layer_id: id,
          layer_name:
            payload.layer_name,
          updated_merchants:
            merchants.length,
          updated_study_areas:
            studyAreas.length,
        },
      );
    },
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const requestId =
    getRequestId(request);

  return withApiLogger(
    request,
    requestId,
    async () => {
      const admin =
        await requireRole(
          request,
          "ADMIN",
        );

      await rateLimiter.checkLimit(
        request,
        `${admin.userId}:admin:map-import-delete`,
      );

      const {
        id,
      } =
        await context.params;

      assertLayerId(id);

      const supabase =
        getServiceRoleSupabaseClient();

      const merchantDelete =
        await supabase
          .from("merchants")
          .delete()
          .contains("metadata", {
            admin_map_import: true,
            import_batch_id: id,
          })
          .select("id");

      if (merchantDelete.error) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Gagal menghapus titik import dari database.",
          true,
        );
      }

      const studyAreaDelete =
        await supabase
          .from("study_areas")
          .delete()
          .contains("metadata", {
            admin_map_import: true,
            import_batch_id: id,
          })
          .select("id");

      if (studyAreaDelete.error) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Titik import terhapus, tetapi batas wilayah import gagal dihapus.",
          true,
        );
      }

      const deletedMerchants =
        merchantDelete.data?.length ?? 0;
      const deletedStudyAreas =
        studyAreaDelete.data?.length ?? 0;

      if (
        deletedMerchants === 0 &&
        deletedStudyAreas === 0
      ) {
        throw new ApplicationError(
          "NOT_FOUND",
          "Layer import tidak ditemukan.",
        );
      }

      return createSuccessResponse(
        requestId,
        {
          layer_id: id,
          deleted_merchants: deletedMerchants,
          deleted_study_areas: deletedStudyAreas,
        },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/admin/map-import/layers/[id]",
  );

function assertLayerId(
  id: string,
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Layer id tidak valid.",
    );
  }
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}
