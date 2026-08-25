import { createHash, randomUUID } from "node:crypto";

import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireRole } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { validateBody } from "@/src/lib/validation";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_COMMIT_BODY_BYTES = 8_388_608;
const MAX_IMPORT_FEATURES = 2_000;

const merchantSchema = z.object({
  id: z.string().min(1).max(240),
  name: z.string().trim().min(1).max(240),
  category: z.string().trim().min(1).max(120),
  brand: z.string().trim().min(1).max(120),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  walkingMinutes: z.number().nonnegative().max(100_000),
  distanceMeters: z.number().nonnegative().max(100_000_000),
  accessibilityScore: z.number().min(0).max(100),
  priceLabel: z.enum(["Hemat", "Sedang", "Premium"]),
  openNow: z.boolean(),
  source: z.string().trim().min(1).max(240),
  status: z.literal("verified"),
  updatedAt: z.string().max(80),
  limitation: z.string().max(1_000),
  address: z.string().max(1_000).optional(),
  phone: z.string().max(120).optional(),
  district: z.string().max(160).optional(),
  village: z.string().max(160).optional(),
  city: z.string().max(160).optional(),
  province: z.string().max(160).optional(),
  collectedAt: z.string().max(120).optional(),
});

const commitSchema = z.object({
  layer_name: z.string().trim().min(1).max(120),
  source_type: z.enum(["PUBLIC_API_URL", "JSON_PAYLOAD"]),
  merchants: z.array(merchantSchema).min(1).max(MAX_IMPORT_FEATURES),
});

type ImportMerchant = z.infer<typeof merchantSchema>;

type RegionSummary = {
  id: string;
  name: string;
  count: number;
  boundaryMethod:
    | "jakarta_admin_curated_boundary"
    | "import_extent_with_safety_padding";
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  geometry: GeoJSON.MultiPolygon;
};

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId = getRequestId(request);

  return withApiLogger(request, requestId, async () => {
    const admin = await requireRole(request, "ADMIN");

    await rateLimiter.checkLimit(
      request,
      `${admin.userId}:admin:map-import-commit`,
    );

    const payload = await validateBody(
      request,
      commitSchema,
      MAX_COMMIT_BODY_BYTES,
    );

    const batchId = randomUUID();
    const importedAt = new Date().toISOString();
    const regions = summarizeRegions(
      payload.merchants,
      batchId,
      payload.layer_name,
    );
    const supabase = getServiceRoleSupabaseClient();

    const sourceCode = `admin_import_${createHash("sha256")
      .update(`${payload.source_type}|${payload.layer_name}`)
      .digest("hex")
      .slice(0, 24)}`;

    const existingSourceResult = await supabase
      .from("spatial_sources")
      .select("id")
      .eq("source_code", sourceCode)
      .maybeSingle();

    const sourceResult = existingSourceResult.data
      ? existingSourceResult
      : await supabase
          .from("spatial_sources")
          .insert({
            source_name: payload.layer_name,
            source_type: "imported",
            source_code: sourceCode,
            provider: "GETRA Admin Import",
            is_active: true,
            is_public: true,
            redistribution_allowed: false,
            terms_confirmed: false,
            metadata: {
              admin_map_import: true,
              source_type: payload.source_type,
            },
          })
      .select("id")
      .single();

    if (existingSourceResult.error || sourceResult.error || !sourceResult.data) {
      const sourceError = existingSourceResult.error ?? sourceResult.error;
      logger.error("Admin map import source upsert failed", {
        requestId,
        errorCode: sourceError?.code ?? "UNKNOWN",
        errorMessage: sourceError?.message ?? "Unknown source error",
      });
      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Gagal menyimpan sumber data import.",
        true,
      );
    }

    const sourceData = sourceResult.data;
    const studyAreaRows = regions.map((region) => ({
      source_id: sourceData.id,
      name: `${payload.layer_name} — ${region.name}`,
      description: `Batas cakupan otomatis untuk batch import ${batchId}.`,
      geometry: toMultiPolygonWkt(region.geometry),
      environment: "PRODUCTION",
      is_public: true,
      data_version: importedAt,
      validation_status: "PENDING" as const,
      source_record_id: `admin-import:${batchId}:${region.id}`,
      metadata: {
        admin_map_import: true,
        import_batch_id: batchId,
        region_id: region.id,
        region_name: region.name,
        feature_count: region.count,
        boundary_method: region.boundaryMethod,
      },
    }));

    const studyAreaResult = await supabase
      .from("study_areas")
      .insert(studyAreaRows)
      .select("id,source_record_id");

    if (studyAreaResult.error) {
      logger.error("Admin map import study area insert failed", {
        requestId,
        errorCode: studyAreaResult.error.code,
        errorMessage: studyAreaResult.error.message,
      });
      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Gagal menyimpan batas wilayah import.",
        true,
      );
    }

    const studyAreaByRegion = new Map(
      (studyAreaResult.data ?? []).map((row) => [
        String(row.source_record_id).split(":").at(-1) ?? "",
        row.id,
      ]),
    );

    const merchantRows = payload.merchants.map((merchant) => {
      const regionName = getMerchantRegionName(merchant, payload.layer_name);
      const regionId = slugify(regionName);

      return {
        name: merchant.name,
        slug: createMerchantSlug(batchId, payload.layer_name, merchant),
        description: `${merchant.category} · ${merchant.brand}`,
        location: `SRID=4326;POINT(${merchant.longitude} ${merchant.latitude})`,
        address: merchant.address ?? null,
        price_level: merchant.priceLabel.toLowerCase(),
        opening_hours: {
          open_now: merchant.openNow,
        },
        is_mobile: false,
        verification_status: "SURVEYED" as const,
        publish_status: "PUBLISHED" as const,
        data_quality_score: merchant.accessibilityScore,
        created_by: admin.userId,
        metadata: {
          admin_map_import: true,
          import_batch_id: batchId,
          layer_name: payload.layer_name,
          source_type: payload.source_type,
          source_record_id: merchant.id,
          category: merchant.category,
          brand: merchant.brand,
          phone: merchant.phone ?? null,
          district: merchant.district ?? null,
          village: merchant.village ?? null,
          city: merchant.city ?? null,
          province: merchant.province ?? null,
          collected_at: merchant.collectedAt ?? null,
          source_updated_at: merchant.updatedAt,
          region_id: regionId,
          region_name: regionName,
          study_area_id: studyAreaByRegion.get(regionId) ?? null,
          imported_at: importedAt,
        },
      };
    });

    const merchantResult = await supabase
      .from("merchants")
      .insert(merchantRows)
      .select("id,slug");

    if (merchantResult.error) {
      logger.error("Admin map import merchant upsert failed", {
        requestId,
        errorCode: merchantResult.error.code,
        errorMessage: merchantResult.error.message,
      });
      const studyAreaIds = (studyAreaResult.data ?? []).map((row) => row.id);

      if (studyAreaIds.length > 0) {
        await supabase.from("study_areas").delete().in("id", studyAreaIds);
      }

      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Gagal menyimpan titik import ke database.",
        true,
      );
    }

    const databaseIdBySlug = new Map(
      (merchantResult.data ?? []).map((row) => [row.slug, row.id]),
    );

    return createSuccessResponse(
      requestId,
      {
        layer_id: batchId,
        layer_name: payload.layer_name,
        source_type: payload.source_type,
        total_features: merchantRows.length,
        merchants: payload.merchants.map((merchant) => ({
          ...merchant,
          id:
            databaseIdBySlug.get(
              createMerchantSlug(batchId, payload.layer_name, merchant),
            ) ?? merchant.id,
          status: "verified" as const,
          limitation:
            "Data tersimpan di database sebagai SURVEYED dan tetap memerlukan verifikasi lapangan sebelum menjadi VERIFIED.",
        })),
        regions,
        persisted: true,
        imported_at: importedAt,
        limitation:
          "Import tersimpan di database. Batas otomatis menunjukkan cakupan titik per wilayah dan bukan pengganti batas administrasi resmi.",
      },
      { status: 201 },
    );
  });
}

export const OPTIONS = createOptionsHandler(
  "/api/admin/map-import/commit",
);

type JakartaAdminBoundaryDefinition = {
  id: string;
  name: string;
  geometry: GeoJSON.MultiPolygon;
};

const JAKARTA_ADMIN_BOUNDARY_REGISTRY: Record<
  string,
  JakartaAdminBoundaryDefinition
> = {
  "jakarta-timur": {
    id: "jakarta-timur",
    name: "Jakarta Timur",
    geometry: {
      type: "MultiPolygon",
      coordinates: [[[
        [106.875034, -6.192381],
        [106.865675, -6.192632],
        [106.860992, -6.194471],
        [106.851038, -6.201599],
        [106.85164, -6.202475],
        [106.852944, -6.201876],
        [106.855478, -6.202718],
        [106.855758, -6.204476],
        [106.854365, -6.206329],
        [106.849981, -6.20553],
        [106.847696, -6.209144],
        [106.837462, -6.205528],
        [106.822776, -6.202678],
        [106.821575, -6.209323],
        [106.818395, -6.214599],
        [106.799785, -6.228819],
        [106.797595, -6.22926],
        [106.795831, -6.229259],
        [106.796632, -6.236997],
        [106.803047, -6.244704],
        [106.807975, -6.252929],
        [106.813541, -6.261923],
        [106.822105, -6.272249],
        [106.829483, -6.287115],
        [106.84076, -6.301083],
        [106.858192, -6.31426],
        [106.881615, -6.315438],
        [106.901006, -6.306754],
        [106.914409, -6.293014],
        [106.930533, -6.278245],
        [106.944767, -6.260246],
        [106.953369, -6.235431],
        [106.960334, -6.213105],
        [106.966587, -6.190106],
        [106.971893, -6.166302],
        [106.969082, -6.152824],
        [106.957915, -6.139855],
        [106.942537, -6.12818],
        [106.919871, -6.120886],
        [106.899748, -6.12347],
        [106.882039, -6.162307],
        [106.878417, -6.167263],
        [106.876357, -6.17464],
        [106.875034, -6.192381],
      ]]],
    },
  },
};

function getMerchantRegionName(
  merchant: ImportMerchant,
  layerName?: string,
) {
  const detectedRegion = detectJakartaAdminRegionName(
    merchant.city,
    merchant.district,
    merchant.province,
    layerName,
  );

  return (
    detectedRegion ||
    merchant.city?.trim() ||
    merchant.district?.trim() ||
    merchant.province?.trim() ||
    layerName?.trim() ||
    "Wilayah import"
  );
}

function summarizeRegions(
  merchants: ImportMerchant[],
  batchId: string,
  layerName: string,
): RegionSummary[] {
  const groups = new Map<string, ImportMerchant[]>();

  for (const merchant of merchants) {
    const name = getMerchantRegionName(merchant, layerName);
    groups.set(name, [...(groups.get(name) ?? []), merchant]);
  }

  return Array.from(groups.entries()).map(([name, members]) => {
    const west = Math.min(...members.map((item) => item.longitude));
    const east = Math.max(...members.map((item) => item.longitude));
    const south = Math.min(...members.map((item) => item.latitude));
    const north = Math.max(...members.map((item) => item.latitude));
    const longitudePadding = Math.max((east - west) * 0.08, 0.002);
    const latitudePadding = Math.max((north - south) * 0.08, 0.002);
    const bounds = {
      west: west - longitudePadding,
      south: south - latitudePadding,
      east: east + longitudePadding,
      north: north + latitudePadding,
    };
    const curatedBoundary =
      JAKARTA_ADMIN_BOUNDARY_REGISTRY[slugify(name)];

    return {
      id: curatedBoundary?.id ?? slugify(name),
      name: curatedBoundary?.name ?? name,
      count: members.length,
      boundaryMethod: curatedBoundary
        ? "jakarta_admin_curated_boundary"
        : "import_extent_with_safety_padding",
      bounds,
      geometry:
        curatedBoundary?.geometry ?? {
          type: "MultiPolygon",
          coordinates: [[[
            [bounds.west, bounds.south],
            [bounds.east, bounds.south],
            [bounds.east, bounds.north],
            [bounds.west, bounds.north],
            [bounds.west, bounds.south],
          ]]],
        },
      batch_id: batchId,
    } as RegionSummary & { batch_id: string };
  });
}

function detectJakartaAdminRegionName(
  ...candidates: Array<string | undefined>
) {
  const combined = candidates
    .filter((candidate): candidate is string => Boolean(candidate?.trim()))
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\bjakarta\s*timur\b|\bjakarta\s*tim\b|\bjatim\b/.test(combined)) {
    return "Jakarta Timur";
  }

  if (/\bjakarta\s*pusat\b|\bjakarta\s*pus\b|\bjakpus\b/.test(combined)) {
    return "Jakarta Pusat";
  }

  if (/\bjakarta\s*barat\b|\bjakarta\s*bar\b|\bjakbar\b/.test(combined)) {
    return "Jakarta Barat";
  }

  return null;
}

function createMerchantSlug(
  batchId: string,
  layerName: string,
  merchant: ImportMerchant,
) {
  const digest = createHash("sha256")
    .update(
      `${batchId}|${layerName}|${merchant.id}|${merchant.longitude}|${merchant.latitude}`,
    )
    .digest("hex")
    .slice(0, 24);

  return `admin-import-${digest}`;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "wilayah-import"
  );
}

function toMultiPolygonWkt(geometry: GeoJSON.MultiPolygon) {
  const polygons = geometry.coordinates
    .map(
      (polygon) =>
        `(${polygon
          .map(
            (ring) =>
              `(${ring.map(([longitude, latitude]) => `${longitude} ${latitude}`).join(", ")})`,
          )
          .join(", ")})`,
    )
    .join(", ");

  return `SRID=4326;MULTIPOLYGON(${polygons})`;
}
