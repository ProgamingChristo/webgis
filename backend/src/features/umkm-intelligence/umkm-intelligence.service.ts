import { resolveAnalyticsCategory } from "@/src/features/demand-intelligence";
import { ApplicationError } from "@/src/lib/errors";
import {
  DATA_READINESS_MODEL_VERSION,
  LOCATION_READINESS_MODEL_VERSION,
  RECOMMENDATION_MODEL_VERSION,
  SOURCE_FRESHNESS_DAYS,
  UMKM_INTELLIGENCE_LIMITATIONS,
  VISIBILITY_MODEL_VERSION,
} from "./umkm-intelligence.constants";
import {
  calculateDataReadiness,
  calculateLocationReadiness,
  calculateVisibilityReadiness,
} from "./umkm-intelligence.model";
import { UmkmIntelligenceRepository } from "./umkm-intelligence.repository";
import type {
  IntelligenceRecommendation,
  MerchantEvidenceInput,
  MerchantIntelligenceResult,
} from "./umkm-intelligence.types";
import type { UmkmIntelligenceQuery } from "./umkm-intelligence.schema";

export class UmkmIntelligenceService {
  constructor(private readonly repository: UmkmIntelligenceRepository) {}

  async analyze(userId: string, query: UmkmIntelligenceQuery): Promise<MerchantIntelligenceResult> {
    const merchant = await this.repository.getMerchant(query.merchant_id);
    if (!merchant) throw new ApplicationError("NOT_FOUND");
    const role = await this.repository.getAccountRole(userId);
    const approvedClaim = merchant.owner_id === userId
      ? true
      : await this.repository.hasApprovedClaim(userId, query.merchant_id);
    if (role !== "ADMIN" && merchant.owner_id !== userId && !approvedClaim) {
      throw new ApplicationError("FORBIDDEN", "Merchant ownership is required.");
    }

    const point = readPoint(merchant.location);
    if (!point) return this.buildWithoutLocation(merchant);
    const metadata = asObject(merchant.metadata);
    const sourceEvidence = await this.repository.getSourceEvidence(merchant.id);
    const observed = latestObserved(sourceEvidence.observations);
    const observedProperties = asObject(observed?.normalized_properties);
    const categoryLabel = firstString(
      metadata.category,
      metadata.category_label,
      observedProperties.jenis_tempat,
      merchant.description,
      merchant.name,
    ) ?? "Kategori belum tersedia";
    const categorySlug = resolveAnalyticsCategory(categoryLabel);
    const now = new Date();
    const endAt = now.toISOString();
    const startAt = new Date(now.getTime() - query.days * 86_400_000).toISOString();

    const [analyticsResult, regions, routeResult, transitPage] = await Promise.all([
      categorySlug
        ? this.repository.demand.get({
            category: categorySlug,
            start_at: startAt,
            end_at: endAt,
            region_ids: [],
            bbox: {
              west: point.longitude - 0.00005,
              south: point.latitude - 0.00005,
              east: point.longitude + 0.00005,
              north: point.latitude + 0.00005,
            },
            limit: 2,
          })
        : Promise.resolve(null),
      this.repository.listRegions(),
      this.repository.network.route(
        { ...point, source: "EXPLICIT_ORIGIN" },
        point,
      ).catch(() => ({ status: "NO_NETWORK_ACCESS" })),
      this.repository.listTransit(point.latitude, point.longitude)
        .catch(() => ({ items: [], total: 0 } as any)),
    ]);

    const analyticsRow = analyticsResult?.rows[0] ?? null;
    const region = analyticsRow
      ? regions.find((item: any) => item.id === analyticsRow.spatial_unit.id)
      : null;
    const transitCandidates = (transitPage.items ?? [])
      .map((node: any) => ({ node, point: readPoint(node.geometry) }))
      .filter((item: any) => item.point !== null)
      .map((item: any) => ({
        candidate_id: item.node.id,
        longitude: item.point.longitude,
        latitude: item.point.latitude,
        node: item.node,
      }));
    const transitWalking = transitCandidates.length
      ? await this.repository.network.walkingCosts(
          { ...point, source: "EXPLICIT_ORIGIN" },
          transitCandidates.map(({ candidate_id, longitude, latitude }: any) => ({ candidate_id, longitude, latitude })),
        ).catch(() => ({ status: "NO_NETWORK_ACCESS", candidates: [] }))
      : { status: "NO_NETWORK_ACCESS", candidates: [] };
    const nearestTransitRoute = transitWalking.candidates
      .filter((candidate) => candidate.status === "ROUTABLE" && candidate.duration_seconds !== null)
      .sort((left, right) => (left.duration_seconds ?? Infinity) - (right.duration_seconds ?? Infinity))[0];
    const nearestTransitInput = nearestTransitRoute
      ? transitCandidates.find((candidate: any) => candidate.candidate_id === nearestTransitRoute.candidate_id)
      : null;

    const fields = buildEvidenceFields(merchant, metadata, observedProperties, Boolean(analyticsRow), routeResult.status, Boolean(nearestTransitRoute));
    const dataReadiness = calculateDataReadiness(fields);
    const visibility = calculateVisibilityReadiness(fields);
    const locationReadiness = calculateLocationReadiness(fields);
    const marketStatus = !analyticsRow
      ? "UNAVAILABLE"
      : analyticsRow.evidence.confidence === "INSUFFICIENT_DATA"
        ? "INSUFFICIENT_DATA"
        : "AVAILABLE";
    const similar = analyticsRow && region && categorySlug
      ? await this.repository.listSimilarMerchants({
          regionId: analyticsRow.spatial_unit.id,
          bounds: {
            west: Number(region.west), south: Number(region.south),
            east: Number(region.east), north: Number(region.north),
          },
          category: categorySlug,
          merchantId: merchant.id,
        }).catch(() => [])
      : [];
    const recommendations = buildRecommendations(fields, visibility.score, analyticsRow);
    const latestAt = latestDate([merchant.updated_at, observed?.observed_at, observed?.imported_at]);
    const sourceNames = [...new Set(sourceEvidence.links.map((link: any) =>
      link.source_table === "mapid_premium_merchants" ? "PREMIUM" : "MENU_GO",
    ))];

    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        category: categoryLabel,
        category_slug: categorySlug,
        address: merchant.address,
        ...point,
        is_mobile: merchant.is_mobile,
        publish_status: merchant.publish_status,
        verification_status: merchant.verification_status,
        source_evidence: sourceNames,
        source_freshness: freshness(latestAt, now),
        updated_at: merchant.updated_at,
      },
      data_readiness: dataReadiness,
      visibility,
      location_readiness: locationReadiness,
      market_context: {
        status: marketStatus,
        area: analyticsRow ? analyticsRow.spatial_unit : null,
        category_slug: categorySlug,
        window: analyticsResult?.window ?? null,
        demand_score: analyticsRow?.demand_score ?? null,
        supply_score: analyticsRow?.supply_score ?? null,
        retail_gap: analyticsRow?.retail_gap ?? null,
        raw_counts: analyticsRow?.raw_counts ?? null,
        confidence: analyticsRow?.evidence.confidence ?? "UNAVAILABLE",
        demand_model_version: analyticsResult?.demand_model_version ?? null,
        retail_gap_model_version: analyticsResult?.retail_gap_model_version ?? null,
        claim_scope: analyticsResult?.claim_scope ?? null,
      },
      location_context: {
        network_status: normalizeNetworkStatus(routeResult.status),
        nearest_transit: nearestTransitRoute && nearestTransitInput ? {
          id: nearestTransitInput.node.id,
          name: nearestTransitInput.node.name,
          transport_mode: nearestTransitInput.node.transport_mode,
          longitude: nearestTransitInput.longitude,
          latitude: nearestTransitInput.latitude,
          network_distance_meters: Math.round(nearestTransitRoute.distance_meters ?? 0),
          network_walking_seconds: Math.round(nearestTransitRoute.duration_seconds ?? 0),
        } : null,
        analysis_method: "PGROUTING_NETWORK",
      },
      nearby_similar_merchants: similar.map((item) => ({
        id: item.id, name: item.name, category: item.category,
        longitude: item.longitude, latitude: item.latitude,
      })),
      recommendations,
      model_versions: {
        data_readiness: DATA_READINESS_MODEL_VERSION,
        visibility: VISIBILITY_MODEL_VERSION,
        location_readiness: LOCATION_READINESS_MODEL_VERSION,
        demand: "GETRA_DEMAND_V1",
        retail_gap: "GETRA_RETAIL_GAP_V1",
        recommendations: RECOMMENDATION_MODEL_VERSION,
      },
      limitations: [...UMKM_INTELLIGENCE_LIMITATIONS],
    };
  }

  private buildWithoutLocation(merchant: any): MerchantIntelligenceResult {
    const metadata = asObject(merchant.metadata);
    const categoryLabel = firstString(metadata.category, metadata.category_label, merchant.description, merchant.name) ?? "Kategori belum tersedia";
    const categorySlug = resolveAnalyticsCategory(categoryLabel);
    const fields = buildEvidenceFields(merchant, metadata, {}, false, "UNAVAILABLE", false);
    return {
      merchant: {
        id: merchant.id, name: merchant.name, category: categoryLabel, category_slug: categorySlug,
        address: merchant.address, longitude: 0, latitude: 0, is_mobile: merchant.is_mobile,
        publish_status: merchant.publish_status, verification_status: merchant.verification_status,
        source_evidence: [], source_freshness: freshness(merchant.updated_at, new Date()), updated_at: merchant.updated_at,
      },
      data_readiness: calculateDataReadiness(fields),
      visibility: calculateVisibilityReadiness(fields),
      location_readiness: calculateLocationReadiness(fields),
      market_context: {
        status: "UNAVAILABLE", area: null, category_slug: categorySlug, window: null,
        demand_score: null, supply_score: null, retail_gap: null, raw_counts: null,
        confidence: "UNAVAILABLE", demand_model_version: null, retail_gap_model_version: null, claim_scope: null,
      },
      location_context: { network_status: "UNAVAILABLE", nearest_transit: null, analysis_method: "PGROUTING_NETWORK" },
      nearby_similar_merchants: [],
      recommendations: buildRecommendations(fields, 0, null),
      model_versions: {
        data_readiness: DATA_READINESS_MODEL_VERSION, visibility: VISIBILITY_MODEL_VERSION,
        location_readiness: LOCATION_READINESS_MODEL_VERSION, demand: "GETRA_DEMAND_V1",
        retail_gap: "GETRA_RETAIL_GAP_V1", recommendations: RECOMMENDATION_MODEL_VERSION,
      },
      limitations: [...UMKM_INTELLIGENCE_LIMITATIONS],
    };
  }
}

function buildEvidenceFields(merchant: any, metadata: Record<string, unknown>, observed: Record<string, unknown>, regionKnown: boolean, networkStatus: unknown, transitRoutable: boolean): MerchantEvidenceInput {
  // Approved registrations preserve their reviewed public fields in these objects.
  // Imported GETRA/MAPID/Menu Go evidence remains a fallback for existing merchants.
  const publicMedia = asObject(metadata.public_media);
  const businessInfo = asObject(metadata.business_info);
  return {
    name: Boolean(merchant.name?.trim()),
    category: Boolean(resolveAnalyticsCategory(firstString(metadata.category, metadata.category_label, observed.jenis_tempat, merchant.description, merchant.name))),
    location: Boolean(readPoint(merchant.location)),
    address: Boolean(merchant.address?.trim()),
    openingHours: hasValues(merchant.opening_hours),
    price: Boolean(firstString(merchant.price_level, businessInfo.price_range, observed.harga_rata_rata)),
    photo: Boolean(firstString(publicMedia.storefront_url, metadata.photo, metadata.photo_url, observed.foto_tempat)) || hasStringItems(publicMedia.product_urls),
    menu: hasStringItems(publicMedia.menu_urls) || Boolean(firstString(observed.menu_utama, observed.foto_menu_1, observed.foto_menu_2)),
    phone: Boolean(firstString(businessInfo.contact_phone, metadata.phone, metadata.phone_number)),
    verified: merchant.verification_status === "VERIFIED",
    published: merchant.publish_status === "PUBLISHED",
    isMobile: Boolean(merchant.is_mobile),
    regionKnown,
    networkStatus: normalizeNetworkStatus(networkStatus),
    transitRoutable,
  };
}

export function buildRecommendations(fields: MerchantEvidenceInput, visibilityScore: number, analyticsRow: any): IntelligenceRecommendation[] {
  const items: IntelligenceRecommendation[] = [];
  const add = (item: IntelligenceRecommendation) => { if (!items.some((existing) => existing.id === item.id)) items.push(item); };
  if (!fields.category) add({ id: "COMPLETE_CATEGORY", priority: "HIGH", title: "Lengkapi kategori", reason: "Kategori belum dapat dipetakan untuk discovery dan analytics.", action: "Pilih kategori canonical yang paling sesuai dan dapat diverifikasi." });
  if (!fields.location) add({ id: "VERIFY_LOCATION", priority: "HIGH", title: "Verifikasi lokasi", reason: "Titik lokasi belum tersedia untuk pencarian spasial.", action: "Lengkapi titik lokasi merchant melalui alur pengajuan resmi." });
  if (!fields.openingHours) add({ id: "ADD_OPENING_HOURS", priority: "MEDIUM", title: "Tambahkan jam operasional", reason: "GETRA belum dapat memastikan merchant memenuhi filter buka sekarang.", action: "Lengkapi jam operasional yang dapat diverifikasi." });
  if (!fields.price) add({ id: "ADD_PRICE_DATA", priority: "MEDIUM", title: "Tambahkan bukti harga", reason: "Merchant belum dapat dievaluasi dengan yakin untuk filter budget.", action: "Tambahkan menu atau informasi harga yang dapat diverifikasi." });
  if (!fields.photo) add({ id: "ADD_PROFILE_PHOTO", priority: "LOW", title: "Lengkapi foto profil", reason: "Bukti foto merchant belum tersedia.", action: "Unggah foto merchant melalui profil atau pengajuan resmi." });
  if (!fields.menu) add({ id: "ADD_MENU_EVIDENCE", priority: "LOW", title: "Lengkapi informasi menu", reason: "Bukti menu belum tersedia pada profil canonical.", action: "Tambahkan menu atau foto menu yang dapat diverifikasi." });
  if (!fields.phone) add({ id: "ADD_CONTACT", priority: "LOW", title: "Lengkapi kontak", reason: "Kontak merchant belum tersedia.", action: "Tambahkan nomor kontak bisnis yang dapat diverifikasi." });
  if (fields.location && fields.networkStatus !== "ROUTABLE") add({ id: "REVIEW_PEDESTRIAN_ACCESS", priority: "MEDIUM", title: "Tinjau akses pedestrian", reason: "pgRouting belum menemukan akses jaringan yang dapat digunakan.", action: "Periksa ketepatan titik lokasi dan cakupan jaringan pedestrian GETRA." });
  if (analyticsRow?.evidence?.confidence !== "INSUFFICIENT_DATA" && analyticsRow?.retail_gap > 0 && visibilityScore < 80) {
    add({ id: "STRENGTHEN_DISCOVERY_READINESS", priority: "LOW", title: "Perkuat kesiapan discovery", reason: "Sinyal demand relatif melebihi represented supply, tetapi kesiapan discovery belum penuh.", action: "Selesaikan kekurangan profil yang tercantum tanpa menganggap sinyal ini sebagai jaminan finansial." });
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  return items.sort((left, right) => order[left.priority] - order[right.priority] || left.id.localeCompare(right.id));
}

function readPoint(value: unknown): { longitude: number; latitude: number } | null {
  if (typeof value === "object" && value !== null && Array.isArray((value as any).coordinates)) {
    const [longitude, latitude] = (value as any).coordinates;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) return { longitude, latitude };
  }
  if (typeof value === "string") {
    const match = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(value);
    if (match) return { longitude: Number(match[1]), latitude: Number(match[2]) };
  }
  return null;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function hasValues(value: unknown) {
  return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}

function hasStringItems(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim().length > 0);
}

function latestObserved(rows: any[]) {
  return [...rows].sort((left, right) => String(right.observed_at ?? right.imported_at ?? "").localeCompare(String(left.observed_at ?? left.imported_at ?? "")))[0];
}

function latestDate(values: unknown[]) {
  const dates = values.filter((value): value is string => typeof value === "string").map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()));
  return dates.sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
}

function freshness(value: Date | string | null, now: Date): "FRESH" | "STALE" | "UNKNOWN" {
  if (!value) return "UNKNOWN";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";
  return now.getTime() - date.getTime() <= SOURCE_FRESHNESS_DAYS * 86_400_000 ? "FRESH" : "STALE";
}

function normalizeNetworkStatus(value: unknown): "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | "UNAVAILABLE" {
  return value === "ROUTABLE" || value === "UNROUTABLE" || value === "NO_NETWORK_ACCESS" ? value : "UNAVAILABLE";
}
