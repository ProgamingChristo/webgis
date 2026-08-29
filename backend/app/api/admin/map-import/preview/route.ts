import type {
  NextRequest,
  NextResponse,
} from "next/server";
import type * as GeoJSON from "geojson";
import { z } from "zod";

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireRole } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { validateBody } from "@/src/lib/validation";
import { JAKARTA_ADMIN_BOUNDARY_REGISTRY } from "@/data/jakarta-admin-boundaries";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_ADMIN_IMPORT_BODY_BYTES =
  1_048_576;

const MAX_PUBLIC_JSON_BYTES =
  2_097_152;

const PUBLIC_JSON_FETCH_TIMEOUT_MS =
  15_000;

const adminMapImportPreviewSchema =
  z.discriminatedUnion(
    "source_type",
    [
      z.object({
        source_type: z.literal(
          "PUBLIC_API_URL",
        ),
        url: z
          .string()
          .url()
          .max(2048),
        layer_name: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional(),
      }),
      z.object({
        source_type: z.literal(
          "JSON_PAYLOAD",
        ),
        payload: z.unknown(),
        layer_name: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional(),
      }),
    ],
  );

type AdminImportMerchant = {
  id: string;
  name: string;
  category: string;
  brand: string;
  longitude: number;
  latitude: number;
  walkingMinutes: number;
  distanceMeters: number;
  accessibilityScore: number;
  priceLabel: "Hemat" | "Sedang" | "Premium";
  openNow: boolean;
  source: string;
  status: "verified";
  updatedAt: string;
  limitation: string;
  address?: string;
  phone?: string;
  district?: string;
  village?: string;
  city?: string;
  province?: string;
  collectedAt?: string;
};

type GenericFeature = {
  id?: string | number;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
};

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId =
    getRequestId(
      request,
    );

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
        `${admin.userId}:admin:map-import-preview`,
      );

      const payload =
        await validateBody(
          request,
          adminMapImportPreviewSchema,
          MAX_ADMIN_IMPORT_BODY_BYTES,
        );

      const rawData =
        payload.source_type ===
        "PUBLIC_API_URL"
          ? await fetchPublicJson(
              payload.url,
            )
          : payload.payload;

      const layerName =
        payload.layer_name ||
        getLayerName(
          rawData,
        ) ||
        (payload.source_type ===
        "PUBLIC_API_URL"
          ? "Admin import dari API publik"
          : "Admin import dari JSON");

      const merchants =
        normalizeImportPayload(
          rawData,
          layerName,
        );

      const batchId = `admin-import-${Date.now()}`;
      const regions = summarizeRegions(
        merchants,
        batchId,
        layerName,
      );
      const boundaries: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
        type: "FeatureCollection",
        features: regions.map((region) => ({
          type: "Feature",
          id: region.id,
          properties: {
            id: region.id,
            name: region.name,
            feature_count: region.count,
            boundary_method: region.boundaryMethod,
            import_batch_id: batchId,
          },
          geometry: region.geometry,
        })),
      };

      return createSuccessResponse(
        requestId,
        {
          layer_id: batchId,
          layer_name: layerName,
          source_type: payload.source_type,
          total_features: merchants.length,
          merchants,
          regions,
          boundaries,
          limitation:
            "Layer admin import bersifat sementara untuk preview dan disimpan di browser admin. Belum menulis massal ke database.",
        },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/admin/map-import/preview",
  );

async function fetchPublicJson(
  urlText: string,
) {
  const url =
    new URL(urlText);

  assertPublicHttpUrl(
    url,
  );

  const response =
    await fetch(
      url,
      {
        headers: {
          accept:
            "application/json",
          "user-agent":
            "GETRA/0.1 admin map import preview",
        },
        signal:
          AbortSignal.timeout(
            PUBLIC_JSON_FETCH_TIMEOUT_MS,
          ),
      },
    );

  if (!response.ok) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      "Public API URL is unavailable",
      true,
    );
  }

  const contentType =
    response.headers
      .get("content-type")
      ?.toLowerCase() ?? "";

  if (
    contentType &&
    !contentType.includes(
      "json",
    )
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Public API response must be JSON",
    );
  }

  const declaredLength =
    response.headers.get(
      "content-length",
    );

  if (
    declaredLength &&
    Number(declaredLength) >
      MAX_PUBLIC_JSON_BYTES
  ) {
    throw new ApplicationError(
      "REQUEST_TOO_LARGE",
    );
  }

  const text =
    await response.text();

  if (
    new TextEncoder().encode(
      text,
    ).byteLength >
    MAX_PUBLIC_JSON_BYTES
  ) {
    throw new ApplicationError(
      "REQUEST_TOO_LARGE",
    );
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  } catch {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Public API response JSON is invalid",
    );
  }
}

function assertPublicHttpUrl(
  url: URL,
) {
  if (
    url.protocol !==
      "https:" &&
    url.protocol !==
      "http:"
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Only http/https public URLs are allowed",
    );
  }

  const hostname =
    url.hostname.toLowerCase();

  if (
    hostname ===
      "localhost" ||
    hostname.endsWith(
      ".localhost",
    ) ||
    hostname ===
      "0.0.0.0" ||
    hostname ===
      "::1" ||
    hostname.startsWith(
      "127.",
    ) ||
    hostname.startsWith(
      "10.",
    ) ||
    hostname.startsWith(
      "192.168.",
    ) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(
      hostname,
    )
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Private or local URLs are not allowed",
    );
  }
}

function normalizeImportPayload(
  rawData: unknown,
  layerName: string,
): AdminImportMerchant[] {
  const features =
    extractFeatures(
      rawData,
    );

  return features
    .map(
      (
        feature,
        index,
      ) =>
        normalizeFeature(
          feature,
          index,
          layerName,
        ),
    )
    .filter(
      (
        merchant,
      ): merchant is AdminImportMerchant =>
        merchant !== null,
    );
}

function extractFeatures(
  rawData: unknown,
): GenericFeature[] {
  if (
    isRecord(
      rawData,
    ) &&
    Array.isArray(
      rawData.features,
    )
  ) {
    return rawData.features.map(
      coerceFeature,
    );
  }

  if (
    isRecord(
      rawData,
    ) &&
    Array.isArray(
      rawData.records,
    )
  ) {
    return rawData.records.map(
      coerceFeature,
    );
  }

  if (
    Array.isArray(
      rawData,
    )
  ) {
    return rawData.map(
      coerceFeature,
    );
  }

  throw new ApplicationError(
    "VALIDATION_ERROR",
    "Import JSON must be a GeoJSON FeatureCollection, features array, records array, or plain array",
  );
}

function coerceFeature(
  value: unknown,
): GenericFeature {
  if (
    !isRecord(
      value,
    )
  ) {
    return {
      properties: {},
    };
  }

  return {
    id:
      typeof value.id ===
        "string" ||
      typeof value.id ===
        "number"
        ? value.id
        : undefined,
    geometry:
      isRecord(
        value.geometry,
      )
        ? {
            type:
              readString(
                value.geometry.type,
              ),
            coordinates:
              value.geometry.coordinates,
          }
        : undefined,
    properties:
      isRecord(
        value.properties,
      )
        ? value.properties
        : value,
  };
}

function normalizeFeature(
  feature: GenericFeature,
  index: number,
  layerName: string,
): AdminImportMerchant | null {
  const properties =
    feature.properties ?? {};

  const coordinates =
    Array.isArray(
      feature.geometry?.coordinates,
    )
      ? feature.geometry.coordinates
      : null;

  const longitude =
    firstNumber(
      properties,
      [
        "longitude",
        "Longitude",
        "LONGITUDE",
        "lng",
        "Lng",
        "LNG",
        "lon",
        "Lon",
        "LON",
        "x",
        "X",
      ],
    ) ??
    toFiniteNumber(
      coordinates?.[0],
    );

  const latitude =
    firstNumber(
      properties,
      [
        "latitude",
        "Latitude",
        "LATITUDE",
        "lat",
        "Lat",
        "LAT",
        "y",
        "Y",
      ],
    ) ??
    toFiniteNumber(
      coordinates?.[1],
    );

  if (
    longitude === null ||
    latitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  const name =
    firstString(
      properties,
      [
        "NAMA",
        "nama",
        "name",
        "Name",
        "NAME",
        "merchant_name",
        "title",
      ],
    ) ||
    `Admin Import ${index + 1}`;

  const category =
    firstString(
      properties,
      [
        "TIPE_3",
        "category",
        "Category",
        "kategori",
        "jenis",
        "type",
      ],
    ) ||
    "Admin Import";

  const brand =
    firstString(
      properties,
      [
        "TIPE_2",
        "brand",
        "Brand",
        "merek",
        "operator",
      ],
    ) ||
    category;

  const statusText =
    firstString(
      properties,
      [
        "STATUS",
        "status",
        "open_status",
      ],
    ).toUpperCase();

  return {
    id:
      `admin-import-${feature.id ?? `${longitude}-${latitude}-${index}`}`,
    name,
    category,
    brand,
    longitude,
    latitude,
    walkingMinutes:
      0,
    distanceMeters:
      0,
    accessibilityScore:
      80,
    priceLabel:
      "Sedang",
    openNow:
      statusText !== "TUTUP" &&
      statusText !== "CLOSED",
    source:
      layerName,
    status:
      "verified",
    updatedAt:
      firstString(
        properties,
        [
          "TANGGAL UPDATE",
          "updatedAt",
          "updated_at",
          "updated",
        ],
      ) ||
      new Date().toISOString(),
    limitation:
      "Data berasal dari admin import sementara. Validasi lapangan dan persistensi database belum dilakukan.",
    address:
      firstOptionalString(
        properties,
        [
          "ALAMAT",
          "address",
          "Address",
          "alamat",
        ],
      ),
    phone:
      firstOptionalString(
        properties,
        [
          "TELEPON",
          "phone",
          "Phone",
          "telepon",
        ],
      ),
    district:
      firstOptionalString(
        properties,
        [
          "KECAMATAN",
          "district",
          "District",
          "kecamatan",
        ],
      ),
    village:
      firstOptionalString(
        properties,
        [
          "DESA",
          "village",
          "Village",
          "kelurahan",
        ],
      ),
    city:
      firstOptionalString(
        properties,
        [
          "KABKOT",
          "city",
          "City",
          "kota",
        ],
      ),
    province:
      firstOptionalString(
        properties,
        [
          "PROVINSI",
          "province",
          "Province",
          "provinsi",
        ],
      ),
    collectedAt:
      firstOptionalString(
        properties,
        [
          "TANGGAL PENGUMPULAN",
          "collectedAt",
          "collected_at",
        ],
      ),
  };
}

function getLayerName(
  value: unknown,
) {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  return (
    readString(
      value.layer_name,
    ) ||
    readString(
      value.name,
    ) ||
    null
  );
}

function firstOptionalString(
  record: Record<string, unknown>,
  keys: string[],
) {
  const value =
    firstString(
      record,
      keys,
    );

  return value || undefined;
}

function firstString(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value =
      readString(
        record[key],
      );

    if (value) {
      return value;
    }
  }

  return "";
}

function firstNumber(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value =
      toFiniteNumber(
        record[key],
      );

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function readString(
  value: unknown,
) {
  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }

  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return String(
      value,
    );
  }

  return "";
}

function toFiniteNumber(
  value: unknown,
) {
  const normalized =
    typeof value ===
    "string"
      ? value
          .trim()
          .replace(
            ",",
            ".",
          )
      : value;

  const number =
    typeof normalized ===
      "number"
      ? normalized
      : typeof normalized ===
          "string"
        ? Number(
            normalized,
          )
        : Number.NaN;

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

type AdminImportRegion = {
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

function getMerchantRegionName(
  merchant: AdminImportMerchant,
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
  merchants: AdminImportMerchant[],
  batchId: string,
  layerName: string,
): AdminImportRegion[] {
  const groups = new Map<string, AdminImportMerchant[]>();

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
    } as AdminImportRegion & { batch_id: string };
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

  if (/\bjakarta\s*selatan\b|\bjakarta\s*sel\b|\bjaksel\b/.test(combined)) {
    return "Jakarta Selatan";
  }

  if (/\bjakarta\s*barat\b|\bjakarta\s*bar\b|\bjakbar\b/.test(combined)) {
    return "Jakarta Barat";
  }

  if (/\bjakarta\s*utara\b|\bjakarta\s*ut\b|\bjakut\b/.test(combined)) {
    return "Jakarta Utara";
  }

  return null;
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
