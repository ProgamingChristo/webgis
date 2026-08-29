import "server-only";

import type { MapidMissionObservationDTO } from "@/src/integrations/mapid/mission.types";
import type { MapidMissionRepository } from "@/src/integrations/mapid/mission.repository";
import type {
  ActivityCategory,
  ContextualObservationFeature,
  ContextualObservationProperties,
  ContextualObservationResult,
  ContextualSource,
} from "@/src/features/contextual-observations/contextual-observation.types";
import type { ContextualObservationQuery } from "@/src/features/contextual-observations/contextual-observation.schema";

const MEDIA_HOSTS = new Set([
  "mapidstorage.cdn.mapid.io",
  "mapid-app-chat.cdn.mapid.io",
]);

const ACTIVITY_CATEGORIES = new Set<ActivityCategory>([
  "TRANSIT_OBSERVATION",
  "ACCESSIBILITY_OBSERVATION",
  "PEDESTRIAN_OBSERVATION",
  "ECONOMIC_UMKM_OBSERVATION",
  "AREA_OBSERVATION",
  "UNCLASSIFIED",
]);

export class ContextualObservationService {
  constructor(private readonly repository: MapidMissionRepository) {}

  async list(query: ContextualObservationQuery): Promise<ContextualObservationResult> {
    const result = await this.repository.listObservations({
      bbox: {
        minLng: query.west,
        minLat: query.south,
        maxLng: query.east,
        maxLat: query.north,
      },
      limit: query.limit,
      offset: query.offset,
      sourceType: query.source,
    });
    const features = result.items
      .map((item) => mapContextualFeature(item, query.source))
      .filter((item): item is ContextualObservationFeature => item !== null);
    const hasMore = query.offset + result.items.length < result.total;

    return {
      bbox: {
        west: query.west,
        south: query.south,
        east: query.east,
        north: query.north,
      },
      feature_collection: { type: "FeatureCollection", features },
      has_more: hasMore,
      limit: query.limit,
      next_offset: hasMore ? query.offset + result.items.length : null,
      offset: query.offset,
      source: query.source,
      total_available: result.total,
      total_features: features.length,
    };
  }
}

function mapContextualFeature(
  item: MapidMissionObservationDTO,
  source: ContextualSource,
): ContextualObservationFeature | null {
  const [longitude, latitude] = item.geometry.coordinates;
  if (
    !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
    longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90
  ) return null;

  const common: ContextualObservationProperties = {
    freshness_status: safeStatus(item.freshness_status, "UNKNOWN"),
    observed_at: safeDate(item.observed_at),
    provenance: {
      imported_at: safeDate(item.provenance.imported_at),
      provider: "MAPID",
      source_type: source,
    },
    semantics: source === "PROPERTI_GO"
      ? "PROPERTY_OBSERVATION"
      : source === "STRUK_GO"
        ? "TRANSACTION_OBSERVATION"
        : "FIELD_OBSERVATION",
    source_id: item.source_id,
    source_type: source,
    verification_status: safeStatus(item.verification_status, "SOURCE_OBSERVED"),
  };

  return {
    type: "Feature",
    id: item.id,
    geometry: item.geometry,
    properties: source === "PROPERTI_GO"
      ? mapProperty(common, item.properties)
      : source === "STRUK_GO"
        ? mapTransaction(common, item.properties)
        : mapActivity(common, item.properties),
  };
}

function mapProperty(
  common: ContextualObservationProperties,
  properties: Record<string, unknown>,
): ContextualObservationProperties {
  return {
    ...common,
    address: safeText(properties.alamat),
    banner_photo_url: safeMediaUrl(properties.foto_spanduk),
    facade_photo_url: safeMediaUrl(properties.foto_tampak_depan),
    property_category: safeText(properties.kategori_properti),
    property_transaction_type: safeText(
      properties.jenis_properti ?? properties.jual_disewa,
    ),
  };
}

function mapTransaction(
  common: ContextualObservationProperties,
  properties: Record<string, unknown>,
): ContextualObservationProperties {
  return {
    ...common,
    payment_method: safeText(properties.metode_pembayaran),
    place_category: safeText(properties.kategori_tempat),
    place_name: safeText(properties.nama_tempat),
    receipt_photo_url: safeMediaUrl(properties.foto_struk),
  };
}

function mapActivity(
  common: ContextualObservationProperties,
  properties: Record<string, unknown>,
): ContextualObservationProperties {
  return {
    ...common,
    activity_category: safeActivityCategory(properties.category),
    description: safeText(properties.description, 600),
    media_urls: safeMediaUrls(properties.media),
    title: safeText(properties.title),
  };
}

function safeText(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function safeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeStatus(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[A-Z_]{2,40}$/.test(value)
    ? value
    : fallback;
}

function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && MEDIA_HOSTS.has(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function safeMediaUrls(value: unknown): string[] {
  const candidates = Array.isArray(value) ? value : [value];
  return [...new Set(candidates.map(safeMediaUrl).filter((url): url is string => Boolean(url)))]
    .slice(0, 4);
}

function safeActivityCategory(value: unknown): ActivityCategory {
  if (typeof value !== "string") return "UNCLASSIFIED";
  const normalized = value.trim().toUpperCase().replace(/[\s/-]+/g, "_") as ActivityCategory;
  return ACTIVITY_CATEGORIES.has(normalized) ? normalized : "UNCLASSIFIED";
}
