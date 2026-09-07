import { ApplicationError } from "@/src/lib/errors";
import type { AnalyticsCategorySlug } from "@/src/features/demand-intelligence";
import type { MapidMissionObservationDTO } from "@/src/integrations/mapid/mission.types";
import { pointGeometrySchema } from "@/src/schemas/spatial.schema";
import { regionContainsPoint } from "./business-space.geometry";
import {
  BUSINESS_SPACE_AGING_DAYS,
  BUSINESS_SPACE_CATCHMENT_MINUTES,
  BUSINESS_SPACE_FRESH_DAYS,
  BUSINESS_SPACE_LIMITATIONS,
  BUSINESS_SPACE_MODEL_VERSION,
  BUSINESS_SPACE_SUPPLY_BBOX_DEGREES,
} from "./business-space.constants";
import type { BusinessSpaceCandidateQuery, BusinessSpaceComparisonInput } from "./business-space.schema";
import { BusinessSpaceRepository } from "./business-space.repository";
import type {
  BusinessSpaceAvailability,
  BusinessSpaceIndicator,
  BusinessSpaceCandidateDetail,
  BusinessSpaceComparison,
  BusinessSpaceMarketContext,
  BusinessSpacePropertyCandidate,
  BusinessSpaceSupplyContext,
} from "./business-space.types";

const MEDIA_HOSTS = new Set(["mapidstorage.cdn.mapid.io", "mapid-app-chat.cdn.mapid.io"]);

export class BusinessSpaceService {
  constructor(private readonly repository: BusinessSpaceRepository) {}

  async listCandidates(query: BusinessSpaceCandidateQuery) {
    const bounds = await this.resolveBounds(query.region_id ?? null, query);
    const result = await this.listFilteredPropertyCandidates(query, bounds);
    return {
      category_slug: query.category,
      days: query.days,
      spatial_scope: query.west !== undefined ? { type: "BBOX" } : { type: "ADMINISTRATIVE_CITY", region_id: query.region_id },
      candidates: result.items.map((item) => mapCandidate(item)),
      total_available: result.total,
      total_is_exact: !result.searchTruncated,
      search_truncated: result.searchTruncated,
      limit: query.limit,
      offset: query.offset,
      has_more: query.offset + result.items.length < result.total,
      limitations: BUSINESS_SPACE_LIMITATIONS,
    };
  }

  async getCandidateDetail(candidateId: string, category: AnalyticsCategorySlug, days: 7 | 30): Promise<BusinessSpaceCandidateDetail> {
    const item = await this.repository.getPropertyObservation(candidateId);
    if (!item) throw new ApplicationError("NOT_FOUND");
    return this.buildDetail(item, category, days);
  }

  async compare(input: BusinessSpaceComparisonInput): Promise<BusinessSpaceComparison> {
    const uniqueIds = [...new Set(input.candidate_ids)];
    if (uniqueIds.length !== input.candidate_ids.length) throw new ApplicationError("VALIDATION_ERROR");
    const candidates = await Promise.all(uniqueIds.map((id) => this.getCandidateDetail(id, input.category, input.days)));
    return {
      category_slug: input.category,
      days: input.days,
      catchment_minutes: BUSINESS_SPACE_CATCHMENT_MINUTES,
      model_version: BUSINESS_SPACE_MODEL_VERSION,
      candidates,
      metric_rows: buildMetricRows(candidates),
      trade_off_summary: buildTradeOff(candidates),
      limitations: BUSINESS_SPACE_LIMITATIONS,
    };
  }

  private async buildDetail(item: MapidMissionObservationDTO, category: AnalyticsCategorySlug, days: 7 | 30): Promise<BusinessSpaceCandidateDetail> {
    const candidate = mapCandidate(item);
    const regions = await this.repository.listRegions().catch(() => []);
    const region = findContainingRegion(regions, candidate) ?? null;
    const endAt = new Date();
    const startAt = new Date(endAt.getTime() - days * 86_400_000);
    const [analytics, walkingContext, transitContext] = await Promise.all([
      region ? this.repository.demand.get({
        category,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        region_ids: [region.id],
        bbox: null,
        limit: 1,
      }).catch(() => null) : Promise.resolve(null),
      this.repository.network.serviceArea({ ...candidate, source: "EXPLICIT_ORIGIN" }, BUSINESS_SPACE_CATCHMENT_MINUTES).catch(() => null),
      this.resolveTransit(candidate).catch(() => ({ status: "UNAVAILABLE" as const, nearest: null })),
    ]);
    const analyticsRow = analytics?.rows[0] ?? null;
    const supply = await this.resolveSupply(candidate, category, region?.id ?? null, analyticsRow?.supply_score ?? null);
    const market = resolveMarketContext(category, analytics, analyticsRow);
    return {
      candidate,
      administrative_context: {
        region_id: region?.id ?? null,
        region_name: region?.name ?? null,
        region_type: region?.id ? "ADMINISTRATIVE_CITY" : "UNKNOWN",
      },
      transit_context: transitContext,
      walking_context: {
        status: walkingContext?.status === "OK" || walkingContext?.status === "ROUTABLE" ? "ROUTABLE" : walkingContext ? "UNROUTABLE" : "UNAVAILABLE",
        catchment_minutes: BUSINESS_SPACE_CATCHMENT_MINUTES,
        service_area_type: "NETWORK_SERVICE_AREA",
        service_area: walkingContext,
      },
      market_context: market,
      supply_context: supply,
      indicators: buildIndicators(candidate, transitContext.status, market, supply),
      model_version: BUSINESS_SPACE_MODEL_VERSION,
      limitations: BUSINESS_SPACE_LIMITATIONS,
    };
  }

  private async resolveBounds(regionId: string | null, query: BusinessSpaceCandidateQuery) {
    if (query.west !== undefined) {
      return { minLng: query.west, minLat: query.south!, maxLng: query.east!, maxLat: query.north! };
    }
    const region = (await this.repository.listRegions()).find((item: any) => item.id === regionId);
    if (!region) throw new ApplicationError("VALIDATION_ERROR");
    return { minLng: Number(region.west), minLat: Number(region.south), maxLng: Number(region.east), maxLat: Number(region.north) };
  }

  private async listFilteredPropertyCandidates(
    query: BusinessSpaceCandidateQuery,
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  ) {
    // The existing RPC provides an exact spatial count; avoid scanning for the
    // common map-pan request, which has no text/property filters.
    if (!query.q && !query.property_category && !query.transaction_type) {
      const result = await this.repository.listPropertyObservations({ bbox: bounds, limit: query.limit, offset: query.offset });
      return { ...result, searchTruncated: false };
    }

    const pageSize = 500;
    const maxPages = 8;
    const filtered: MapidMissionObservationDTO[] = [];
    let sourceOffset = 0;
    let sourceTotal = 0;

    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.repository.listPropertyObservations({
        bbox: bounds,
        limit: pageSize,
        offset: sourceOffset,
      });
      sourceTotal = result.total;
      filtered.push(...result.items.filter((item) => matchesPropertyFilters(item, query)));
      sourceOffset += result.items.length;
      if (result.items.length < pageSize || sourceOffset >= result.total) break;
    }

    return {
      items: filtered.slice(query.offset, query.offset + query.limit),
      total: filtered.length,
      searchTruncated: sourceOffset < sourceTotal,
    };
  }

  private async resolveTransit(candidate: BusinessSpacePropertyCandidate) {
    const page = await this.repository.listTransit(candidate.latitude, candidate.longitude);
    const transitCandidates = (page.items ?? []).map((node: any) => {
      const point = readPoint(node.geometry);
      return point ? { candidate_id: node.id, node, ...point } : null;
    }).filter(Boolean) as any[];
    if (!transitCandidates.length) return { status: "UNAVAILABLE" as const, nearest: null };
    const walking = await this.repository.network.walkingCosts(
      { ...candidate, source: "EXPLICIT_ORIGIN" },
      transitCandidates.map(({ candidate_id, longitude, latitude }) => ({ candidate_id, longitude, latitude })),
    );
    const nearest = walking.candidates
      .filter((item) => item.status === "ROUTABLE" && item.duration_seconds !== null)
      .sort((left, right) => (left.duration_seconds ?? Infinity) - (right.duration_seconds ?? Infinity))[0];
    if (!nearest) return { status: "UNAVAILABLE" as const, nearest: null };
    const node = transitCandidates.find((item) => item.candidate_id === nearest.candidate_id)?.node;
    return {
      status: "AVAILABLE" as const,
      nearest: {
        id: nearest.candidate_id,
        name: node?.name ?? "Transit node",
        transport_mode: node?.transport_mode ?? null,
        network_distance_meters: Math.round(nearest.distance_meters ?? nearest.network_distance_meters ?? 0),
        network_walking_minutes: Math.max(1, Math.ceil((nearest.duration_seconds ?? 0) / 60)),
      },
    };
  }

  private async resolveSupply(
    candidate: BusinessSpacePropertyCandidate,
    category: AnalyticsCategorySlug,
    regionId: string | null,
    supplyScore: number | null,
  ): Promise<BusinessSpaceSupplyContext> {
    const bounds = localBounds(candidate);
    const merchants = await this.repository.listSimilarMerchants({ bounds, category, regionId }).catch(() => []);
    return {
      status: supplyScore === null && merchants.length === 0 ? "INSUFFICIENT_DATA" : "AVAILABLE",
      category_slug: category,
      spatial_context: "ADMINISTRATIVE_CITY",
      comparable_merchant_count: merchants.length,
      comparable_merchants: merchants.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category ?? null,
        longitude: item.longitude,
        latitude: item.latitude,
      })),
      dedupe_basis: "canonical_merchants",
    };
  }
}

function mapCandidate(item: MapidMissionObservationDTO): BusinessSpacePropertyCandidate {
  const point = pointGeometrySchema.safeParse(item.geometry);
  if (!point.success) throw new ApplicationError("DATABASE_ERROR", "Lokasi properti belum dapat dibaca.");
  const [longitude, latitude] = point.data.coordinates;
  const properties = item.properties;
  const importedAt = safeDate(item.provenance.imported_at);
  const observedAt = safeDate(item.observed_at);
  const freshnessStatus = resolveFreshness(observedAt ?? importedAt);
  return {
    id: item.id,
    source_id: item.source_id,
    longitude,
    latitude,
    property_category: safeText(properties.kategori_properti),
    property_transaction_type: safeText(properties.jenis_properti ?? properties.jual_disewa),
    address: safeText(properties.alamat),
    facade_photo_url: safeMediaUrl(properties.foto_tampak_depan),
    banner_photo_url: safeMediaUrl(properties.foto_spanduk),
    observed_at: observedAt,
    imported_at: importedAt,
    freshness: freshnessStatus,
    availability: availability(freshnessStatus),
    provenance: { provider: "MAPID", source_type: "PROPERTI_GO", source_id: item.source_id, imported_at: importedAt },
  };
}

function matchesPropertyFilters(item: MapidMissionObservationDTO, query: BusinessSpaceCandidateQuery) {
  const candidate = mapCandidate(item);
  const text = [
    candidate.property_category,
    candidate.property_transaction_type,
    candidate.address,
    candidate.source_id,
  ].filter(Boolean).join(" ").toLowerCase();

  if (query.q && !text.includes(query.q.toLowerCase())) return false;
  if (query.property_category && !String(candidate.property_category ?? "").toLowerCase().includes(query.property_category.toLowerCase())) return false;
  if (query.transaction_type) {
    const normalized = normalizeTransaction(candidate.property_transaction_type);
    if (normalized !== query.transaction_type) return false;
  }
  return true;
}

function normalizeTransaction(value: string | null) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("sewa")) return "DISEWA";
  if (normalized.includes("jual")) return "DIJUAL";
  return null;
}

function resolveMarketContext(category: AnalyticsCategorySlug, analytics: any, row: any): BusinessSpaceMarketContext {
  return {
    status: !row ? "INSUFFICIENT_DATA" : row.evidence.confidence === "INSUFFICIENT_DATA" ? "INSUFFICIENT_DATA" : "AVAILABLE",
    category_slug: category,
    window: analytics?.window ?? null,
    demand_score: row?.demand_score ?? null,
    supply_score: row?.supply_score ?? null,
    retail_gap: row?.retail_gap ?? null,
    confidence: row?.evidence.confidence ?? "UNAVAILABLE",
    sample_size: row?.evidence.sample_size ?? null,
    demand_model_version: analytics?.demand_model_version ?? null,
    retail_gap_model_version: analytics?.retail_gap_model_version ?? null,
    claim_scope: analytics?.claim_scope ?? null,
  };
}

function buildIndicators(
  candidate: BusinessSpacePropertyCandidate,
  transitStatus: string,
  market: BusinessSpaceMarketContext,
  supply: BusinessSpaceSupplyContext,
): BusinessSpaceIndicator[] {
  return [
    { id: "freshness", label: "Freshness", status: candidate.freshness === "FRESH" ? "POSITIVE" : candidate.freshness === "UNKNOWN" ? "UNKNOWN" : "WATCH", value: candidate.freshness },
    { id: "transit", label: "Transit Access", status: transitStatus === "AVAILABLE" ? "POSITIVE" : "UNKNOWN", value: transitStatus === "AVAILABLE" ? "Network evidence available" : "Unavailable" },
    { id: "demand", label: "Demand Context", status: market.demand_score !== null ? "POSITIVE" : "UNKNOWN", value: market.demand_score === null ? "Insufficient Data" : String(market.demand_score) },
    { id: "supply", label: "Supply Context", status: supply.comparable_merchant_count === null ? "UNKNOWN" : "POSITIVE", value: supply.comparable_merchant_count === null ? "Insufficient Data" : `${supply.comparable_merchant_count} canonical merchants` },
    { id: "retail_gap", label: "Retail Gap Context", status: market.retail_gap === null ? "UNKNOWN" : market.retail_gap > 0 ? "POSITIVE" : "WATCH", value: market.retail_gap === null ? "Insufficient Data" : String(market.retail_gap) },
  ];
}

function buildMetricRows(candidates: BusinessSpaceCandidateDetail[]): BusinessSpaceComparison["metric_rows"] {
  const value = (candidate: BusinessSpaceCandidateDetail, metric: string) => ({ candidate_id: candidate.candidate.id, value: metric, status: "AVAILABLE" as const });
  const marketValue = (candidate: BusinessSpaceCandidateDetail, metric: number | null) => {
    const available = candidate.market_context.status === "AVAILABLE" && metric !== null;
    return {
      candidate_id: candidate.candidate.id,
      value: available ? String(metric) : "Insufficient Data",
      status: available ? "AVAILABLE" as const : "INSUFFICIENT_DATA" as const,
    };
  };
  return [
    { metric: "Transit network walk", values: candidates.map((item) => value(item, item.transit_context.nearest ? `${item.transit_context.nearest.network_walking_minutes} min` : "Unavailable")) },
    { metric: "Demand Score", values: candidates.map((item) => marketValue(item, item.market_context.demand_score)) },
    { metric: "Supply Score", values: candidates.map((item) => marketValue(item, item.market_context.supply_score)) },
    { metric: "Retail Gap", values: candidates.map((item) => marketValue(item, item.market_context.retail_gap)) },
    { metric: "Freshness", values: candidates.map((item) => value(item, item.candidate.freshness)) },
  ];
}

function buildTradeOff(candidates: BusinessSpaceCandidateDetail[]) {
  const transit = [...candidates].filter((item) => item.transit_context.nearest).sort((a, b) => a.transit_context.nearest!.network_walking_minutes - b.transit_context.nearest!.network_walking_minutes)[0];
  const demand = [...candidates].filter((item) => item.market_context.status === "AVAILABLE" && item.market_context.demand_score !== null).sort((a, b) => (b.market_context.demand_score ?? -1) - (a.market_context.demand_score ?? -1))[0];
  const gap = [...candidates].filter((item) => item.market_context.status === "AVAILABLE" && item.market_context.retail_gap !== null).sort((a, b) => (b.market_context.retail_gap ?? -999) - (a.market_context.retail_gap ?? -999))[0];
  return [
    transit ? `${label(transit)} memiliki waktu berjalan kaki ke transit paling singkat dalam perbandingan ini: ${transit.transit_context.nearest!.network_walking_minutes} menit berdasarkan jaringan jalan.` : "Data akses berjalan kaki ke transit belum tersedia untuk properti yang dibandingkan.",
    demand ? `${label(demand)} memiliki indeks permintaan teramati tertinggi (${demand.market_context.demand_score}).` : "Data permintaan belum cukup untuk perbandingan ini.",
    gap ? `${label(gap)} memiliki selisih indeks permintaan dan pasokan tertinggi (${gap.market_context.retail_gap}).` : "Data selisih permintaan dan pasokan belum tersedia.",
    "Gunakan perbandingan ini sebagai bahan pertimbangan. Ketersediaan properti perlu dikonfirmasi dan hasil usaha tidak dijamin.",
  ].join(" ");
}

function label(item: BusinessSpaceCandidateDetail) {
  return item.candidate.address || item.candidate.property_category || item.candidate.id.slice(0, 8);
}

function findContainingRegion(regions: any[], point: { longitude: number; latitude: number }) {
  return regions.find((region) =>
    Number(region.west) <= point.longitude && Number(region.east) >= point.longitude &&
    Number(region.south) <= point.latitude && Number(region.north) >= point.latitude &&
    regionContainsPoint(region.geometry, point));
}

function localBounds(point: { longitude: number; latitude: number }) {
  return {
    west: point.longitude - BUSINESS_SPACE_SUPPLY_BBOX_DEGREES,
    south: point.latitude - BUSINESS_SPACE_SUPPLY_BBOX_DEGREES,
    east: point.longitude + BUSINESS_SPACE_SUPPLY_BBOX_DEGREES,
    north: point.latitude + BUSINESS_SPACE_SUPPLY_BBOX_DEGREES,
  };
}

function readPoint(value: unknown) {
  if (typeof value === "object" && value !== null && Array.isArray((value as any).coordinates)) {
    const [longitude, latitude] = (value as any).coordinates;
    return Number.isFinite(longitude) && Number.isFinite(latitude) ? { longitude, latitude } : null;
  }
  if (typeof value === "string") {
    const match = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(value);
    if (match) return { longitude: Number(match[1]), latitude: Number(match[2]) };
  }
  return null;
}

function safeText(value: unknown, max = 240) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function safeDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeMediaUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && MEDIA_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function resolveFreshness(value: string | null) {
  if (!value) return "UNKNOWN";
  const ageDays = (Date.now() - new Date(value).getTime()) / 86_400_000;
  if (!Number.isFinite(ageDays)) return "UNKNOWN";
  if (ageDays <= BUSINESS_SPACE_FRESH_DAYS) return "FRESH";
  if (ageDays <= BUSINESS_SPACE_AGING_DAYS) return "AGING";
  return "STALE";
}

function availability(freshnessStatus: ReturnType<typeof resolveFreshness>): BusinessSpaceAvailability {
  if (freshnessStatus === "UNKNOWN") return "UNKNOWN_FRESHNESS";
  if (freshnessStatus === "STALE") return "NEEDS_RECONFIRMATION";
  return "AVAILABILITY_UNCONFIRMED";
}
