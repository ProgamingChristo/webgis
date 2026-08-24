import type { NextRequest, NextResponse } from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type JsonRecord = Record<string, unknown>;

export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId = getRequestId(request);

  return withApiLogger(request, requestId, async () => {
    const userId = await requireAuthenticatedUser(request);

    await rateLimiter.checkLimit(
      request,
      `${userId}:map-import-layers`,
    );

    const supabase = getServiceRoleSupabaseClient();
    const [merchantResult, studyAreaResult] = await Promise.all([
      supabase
        .from("merchants")
        .select(
          "id,name,description,location,address,price_level,opening_hours,data_quality_score,metadata,updated_at",
        )
        .contains("metadata", { admin_map_import: true })
        .eq("publish_status", "PUBLISHED")
        .range(0, 4_999),
      supabase
        .from("study_areas")
        .select("id,name,geometry,metadata")
        .contains("metadata", { admin_map_import: true })
        .range(0, 499),
    ]);

    if (merchantResult.error || studyAreaResult.error) {
      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Data import peta belum dapat dibaca.",
        true,
      );
    }

    const boundariesByBatch = new Map<string, GeoJSON.Feature<GeoJSON.MultiPolygon>[]>();

    for (const row of studyAreaResult.data ?? []) {
      const metadata = asRecord(row.metadata);
      const batchId = readString(metadata.import_batch_id);
      const geometry = readMultiPolygon(row.geometry);

      if (!batchId || !geometry) {
        continue;
      }

      const feature: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
        type: "Feature",
        id: row.id,
        properties: {
          id: readString(metadata.region_id),
          name: readString(metadata.region_name) || row.name,
          feature_count: readNumber(metadata.feature_count),
          boundary_method: readString(metadata.boundary_method),
          import_batch_id: batchId,
        },
        geometry,
      };

      boundariesByBatch.set(batchId, [
        ...(boundariesByBatch.get(batchId) ?? []),
        feature,
      ]);
    }

    const layers = new Map<
      string,
      {
        layer_id: string;
        layer_name: string;
        source_type: "PUBLIC_API_URL" | "JSON_PAYLOAD";
        total_features: number;
        merchants: Array<Record<string, unknown>>;
        persisted: true;
        imported_at?: string;
        limitation: string;
        boundaries: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon>;
      }
    >();

    for (const row of merchantResult.data ?? []) {
      const metadata = asRecord(row.metadata);
      const batchId = readString(metadata.import_batch_id);
      const point = readPoint(row.location);

      if (!batchId || !point) {
        continue;
      }

      const existing = layers.get(batchId);
      const layerName = readString(metadata.layer_name) || "Admin import";
      const sourceType =
        readString(metadata.source_type) === "JSON_PAYLOAD"
          ? "JSON_PAYLOAD"
          : "PUBLIC_API_URL";
      const importedAt = readString(metadata.imported_at) || undefined;
      const merchant = {
        id: row.id,
        name: row.name,
        category: readString(metadata.category) || "Admin Import",
        brand: readString(metadata.brand) || "Admin Import",
        longitude: point[0],
        latitude: point[1],
        walkingMinutes: 0,
        distanceMeters: 0,
        accessibilityScore: row.data_quality_score ?? 80,
        priceLabel: toPriceLabel(row.price_level),
        openNow: readBoolean(asRecord(row.opening_hours).open_now, true),
        source: layerName,
        status: "verified" as const,
        updatedAt: row.updated_at,
        limitation:
          "Data admin import tersimpan sebagai SURVEYED dan menunggu verifikasi lapangan.",
        address: row.address ?? undefined,
        phone: readString(metadata.phone) || undefined,
        district: readString(metadata.district) || undefined,
        village: readString(metadata.village) || undefined,
        city: readString(metadata.city) || undefined,
        province: readString(metadata.province) || undefined,
        collectedAt: readString(metadata.collected_at) || undefined,
      };

      if (existing) {
        existing.merchants.push(merchant);
        existing.total_features = existing.merchants.length;
        continue;
      }

      layers.set(batchId, {
        layer_id: batchId,
        layer_name: layerName,
        source_type: sourceType,
        total_features: 1,
        merchants: [merchant],
        persisted: true,
        imported_at: importedAt,
        limitation:
          "Data tersimpan di database. Batas otomatis adalah cakupan data, bukan batas administrasi resmi.",
        boundaries: {
          type: "FeatureCollection",
          features: boundariesByBatch.get(batchId) ?? [],
        },
      });
    }

    return createSuccessResponse(requestId, {
      layers: Array.from(layers.values()).sort((left, right) =>
        (right.imported_at ?? "").localeCompare(left.imported_at ?? ""),
      ),
      total_layers: layers.size,
      total_features: Array.from(layers.values()).reduce(
        (total, layer) => total + layer.total_features,
        0,
      ),
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/map-import/layers");

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readPoint(value: unknown): [number, number] | null {
  const geometry =
    typeof value === "string"
      ? safeJsonParse(value) ?? parseWkbGeometry(value)
      : value;

  if (
    typeof geometry !== "object" ||
    geometry === null ||
    !("coordinates" in geometry) ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    return null;
  }

  const [longitude, latitude] = geometry.coordinates;

  return typeof longitude === "number" && typeof latitude === "number"
    ? [longitude, latitude]
    : null;
}

function readMultiPolygon(value: unknown): GeoJSON.MultiPolygon | null {
  const geometry =
    typeof value === "string"
      ? safeJsonParse(value) ?? parseWkbGeometry(value)
      : value;

  if (
    typeof geometry !== "object" ||
    geometry === null ||
    !("type" in geometry) ||
    geometry.type !== "MultiPolygon" ||
    !("coordinates" in geometry) ||
    !Array.isArray(geometry.coordinates)
  ) {
    return null;
  }

  return geometry as GeoJSON.MultiPolygon;
}

type SupportedWkbGeometry =
  | GeoJSON.Point
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon;

function parseWkbGeometry(value: string): SupportedWkbGeometry | null {
  const trimmed = value.trim();

  if (!/^[0-9a-f]+$/i.test(trimmed) || trimmed.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(trimmed.length / 2);

  for (let index = 0; index < trimmed.length; index += 2) {
    bytes[index / 2] = Number.parseInt(trimmed.slice(index, index + 2), 16);
  }

  try {
    const parser = new WkbParser(bytes);
    const geometry = parser.readGeometry();

    if (geometry?.type === "Polygon") {
      return {
        type: "MultiPolygon",
        coordinates: [geometry.coordinates],
      };
    }

    return geometry;
  } catch {
    return null;
  }
}

class WkbParser {
  private offset = 0;

  private readonly view: DataView;

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  readGeometry(): SupportedWkbGeometry | null {
    const littleEndian = this.readEndian();
    const rawType = this.readUint32(littleEndian);
    const hasSrid = (rawType & 0x20000000) !== 0;
    const hasZ = (rawType & 0x80000000) !== 0;
    const hasM = (rawType & 0x40000000) !== 0;
    const geometryType = rawType & 0x000000ff;

    if (hasSrid) {
      this.readUint32(littleEndian);
    }

    if (geometryType === 1) {
      const coordinates = this.readCoordinate(littleEndian, hasZ, hasM);

      return {
        type: "Point",
        coordinates,
      };
    }

    if (geometryType === 3) {
      return {
        type: "Polygon",
        coordinates: this.readPolygonCoordinates(littleEndian, hasZ, hasM),
      };
    }

    if (geometryType === 6) {
      const polygonCount = this.readUint32(littleEndian);
      const polygons: GeoJSON.Position[][][] = [];

      for (let index = 0; index < polygonCount; index += 1) {
        const geometry = this.readGeometry();

        if (!geometry || geometry.type !== "Polygon") {
          throw new Error("Invalid MultiPolygon member.");
        }

        polygons.push(geometry.coordinates);
      }

      return {
        type: "MultiPolygon",
        coordinates: polygons,
      };
    }

    return null;
  }

  private readEndian(): boolean {
    const value = this.readUint8();

    if (value !== 0 && value !== 1) {
      throw new Error("Invalid WKB byte order.");
    }

    return value === 1;
  }

  private readPolygonCoordinates(
    littleEndian: boolean,
    hasZ: boolean,
    hasM: boolean,
  ): GeoJSON.Position[][] {
    const ringCount = this.readUint32(littleEndian);
    const rings: GeoJSON.Position[][] = [];

    for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
      const pointCount = this.readUint32(littleEndian);
      const ring: GeoJSON.Position[] = [];

      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        ring.push(this.readCoordinate(littleEndian, hasZ, hasM));
      }

      rings.push(ring);
    }

    return rings;
  }

  private readCoordinate(
    littleEndian: boolean,
    hasZ: boolean,
    hasM: boolean,
  ): GeoJSON.Position {
    const longitude = this.readFloat64(littleEndian);
    const latitude = this.readFloat64(littleEndian);

    if (hasZ) {
      this.readFloat64(littleEndian);
    }

    if (hasM) {
      this.readFloat64(littleEndian);
    }

    return [longitude, latitude];
  }

  private readUint8(): number {
    this.ensureAvailable(1);
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  private readUint32(littleEndian: boolean): number {
    this.ensureAvailable(4);
    const value = this.view.getUint32(this.offset, littleEndian);
    this.offset += 4;
    return value;
  }

  private readFloat64(littleEndian: boolean): number {
    this.ensureAvailable(8);
    const value = this.view.getFloat64(this.offset, littleEndian);
    this.offset += 8;
    return value;
  }

  private ensureAvailable(bytes: number): void {
    if (this.offset + bytes > this.view.byteLength) {
      throw new Error("Unexpected end of WKB.");
    }
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function toPriceLabel(value: string | null) {
  if (value?.toLowerCase() === "hemat") {
    return "Hemat" as const;
  }

  if (value?.toLowerCase() === "premium") {
    return "Premium" as const;
  }

  return "Sedang" as const;
}
