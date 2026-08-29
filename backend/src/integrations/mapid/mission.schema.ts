import { createHash } from "node:crypto";

import { z } from "zod";

import { pointGeometrySchema, polygonGeometrySchema } from "@/src/schemas/spatial.schema";
import type {
  MapidMissionSource,
  NormalizedMapidMissionObservation,
} from "@/src/integrations/mapid/mission.types";
import type { JsonObject } from "@/src/types/provenance";

export const mapidMissionSourceSchema = z.enum([
  "MENU_GO",
  "STRUK_GO",
  "PROPERTI_GO",
  "ACTIVITIES",
]);

export const missionSourceToPath: Record<Exclude<MapidMissionSource, "ACTIVITIES">, string> = {
  MENU_GO: "/web/competition/menugo",
  STRUK_GO: "/web/competition/struckgo",
  PROPERTI_GO: "/web/competition/propertigo",
};

export const missionSourceToMissionType: Record<Exclude<MapidMissionSource, "ACTIVITIES">, string> = {
  MENU_GO: "menugo",
  STRUK_GO: "struckgo",
  PROPERTI_GO: "propertigo",
};

export const mapidMissionSyncRequestSchema = z
  .object({
    feature: polygonGeometrySchema,
    max_pages: z.number().int().min(1).max(50).default(1),
    offset: z.number().int().min(0).default(0),
    page_size: z.number().int().min(1).max(1_000).default(500),
    sources: z.array(mapidMissionSourceSchema).min(1).max(4),
  })
  .strict();

export const mapidMissionReadQuerySchema = z
  .object({
    bbox: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
    source_type: mapidMissionSourceSchema.optional(),
  })
  .strict();

export const missionRawRecordSchema = z
  .object({
    geometry: pointGeometrySchema.optional(),
    id: z.union([z.string(), z.number()]).optional(),
    key: z.union([z.string(), z.number()]).optional(),
    mission: z.union([z.string(), z.number()]).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    type: z.string().optional(),
  })
  .passthrough();

const dateLikeFields = [
  "observed_at",
  "tanggal_observasi",
  "tanggal_pengumpulan",
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
] as const;

const sourcePropertyAllowlist: Record<MapidMissionSource, readonly string[]> = {
  MENU_GO: [
    "nama_tempat",
    "jenis_tempat",
    "foto_tempat",
    "foto_menu_1",
    "foto_menu_2",
    "menu_utama",
    "harga_rata_rata",
    "kondisi_tempat",
    "mobilitas",
  ],
  STRUK_GO: [
    "nama_tempat",
    "kategori_tempat",
    "metode_pembayaran",
    "foto_struk",
  ],
  PROPERTI_GO: [
    "kategori_properti",
    "jenis_properti",
    "alamat",
    "foto_tampak_depan",
    "foto_spanduk",
    "jual_disewa",
    "status",
  ],
  ACTIVITIES: [
    "title",
    "description",
    "category",
    "media",
    "author",
  ],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractMissionRecords(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isPlainObject(raw)) return [];

  const candidates = [
    raw.records,
    raw.data,
    isPlainObject(raw.data) ? raw.data.records : undefined,
    isPlainObject(raw.data) ? raw.data.activities : undefined,
    raw.features,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

export function extractMissionPagination(raw: unknown): {
  hasMore: boolean;
  nextOffset: number | null;
} | null {
  if (!isPlainObject(raw) || !isPlainObject(raw.pagination)) return null;

  const parsed = z
    .object({
      hasMore: z.boolean(),
      limit: z.number().int().positive(),
      offset: z.number().int().min(0),
    })
    .safeParse(raw.pagination);
  if (!parsed.success) return null;

  return {
    hasMore: parsed.data.hasMore,
    nextOffset: parsed.data.hasMore
      ? parsed.data.offset + parsed.data.limit
      : null,
  };
}

function compactProperties(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

function getRecordProperties(record: Record<string, unknown>): Record<string, unknown> {
  const properties = isPlainObject(record.properties) ? record.properties : {};
  return { ...record, ...properties };
}

function getStableSourceId(record: Record<string, unknown>): string | null {
  const properties = getRecordProperties(record);
  const id = properties.id ?? properties.key ?? properties._id ?? properties.objectid;
  if (typeof id === "string" && id.trim().length > 0) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

function getMissionName(record: Record<string, unknown>): string | null {
  const mission = getRecordProperties(record).mission;
  if (typeof mission === "string" && mission.trim().length > 0) return mission.trim();
  if (typeof mission === "number" && Number.isFinite(mission)) return String(mission);
  return null;
}

function getPointGeometry(record: Record<string, unknown>) {
  const direct = record.geometry;
  const parsedDirect = pointGeometrySchema.safeParse(direct);
  if (parsedDirect.success) return parsedDirect.data;

  const properties = getRecordProperties(record);
  const longitude = properties.longitude ?? properties.lng ?? properties.lon;
  const latitude = properties.latitude ?? properties.lat;
  const parsedCoordinates = z
    .tuple([z.coerce.number(), z.coerce.number()])
    .safeParse([longitude, latitude]);

  if (!parsedCoordinates.success) return null;
  const parsedPoint = pointGeometrySchema.safeParse({
    type: "Point",
    coordinates: parsedCoordinates.data,
  });
  return parsedPoint.success ? parsedPoint.data : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getSourceDate(record: Record<string, unknown>, fields: readonly string[]): string | null {
  const properties = getRecordProperties(record);
  for (const field of fields) {
    const parsed = normalizeDate(properties[field]);
    if (parsed) return parsed;
  }
  return null;
}

function safeJsonObject(value: Record<string, unknown>): JsonObject {
  const serialized = JSON.stringify(value);
  const parsed: unknown = JSON.parse(serialized);
  if (!isJsonObject(parsed)) throw new Error("MISSION_RECORD_INVALID_JSON");
  return parsed;
}

function isJsonValue(value: unknown): value is import("@/src/types/provenance").JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isJsonObject(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
}

function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function normalizeMissionRecord(
  source: MapidMissionSource,
  rawRecord: unknown,
  retrievedAt: string,
): NormalizedMapidMissionObservation {
  const parsed = missionRawRecordSchema.safeParse(rawRecord);
  if (!parsed.success) {
    throw new Error("MISSION_RECORD_INVALID_SHAPE");
  }

  const raw = parsed.data;
  const sourceRecordId = getStableSourceId(raw);
  if (!sourceRecordId) {
    throw new Error("MISSION_RECORD_MISSING_SOURCE_ID");
  }

  const geometry = getPointGeometry(raw);
  if (!geometry) {
    throw new Error("MISSION_RECORD_INVALID_GEOMETRY");
  }

  const flattened = getRecordProperties(raw);
  const allowedProperties: Record<string, unknown> = Object.fromEntries(
    sourcePropertyAllowlist[source].map((key) => [key, flattened[key]]),
  );
  if (source === "ACTIVITIES") {
    allowedProperties.media = flattened.media ?? flattened.medias;
    allowedProperties.author =
      flattened.author ?? flattened.user_full_name ?? flattened.user_name;
  }
  const observedAt = getSourceDate(raw, dateLikeFields);
  const updatedAt = getSourceDate(raw, ["updated_at", "updatedAt"]);
  const rawPayload = safeJsonObject(raw);

  return {
    source_type: source,
    source_record_id: sourceRecordId,
    mission_name: getMissionName(raw),
    geometry,
    normalized_properties: safeJsonObject({
      ...compactProperties(allowedProperties),
      source_semantics: source === "STRUK_GO"
        ? "TRANSACTION_OBSERVATION"
        : source === "PROPERTI_GO"
          ? "PROPERTY_OBSERVATION"
          : source === "ACTIVITIES"
            ? "FIELD_OBSERVATION"
            : "FIELD_SURVEY_MERCHANT_OBSERVATION",
    }),
    raw_payload: rawPayload,
    raw_payload_checksum: checksum(rawPayload),
    observed_at: observedAt,
    provider_updated_at: updatedAt,
    verification_status: "SOURCE_OBSERVED",
    freshness_status: observedAt ? "FRESH" : "UNKNOWN",
    provenance: {
      imported_at: retrievedAt,
      provider: "MAPID",
      source_record_id: sourceRecordId,
      source_type: source,
    },
  };
}
