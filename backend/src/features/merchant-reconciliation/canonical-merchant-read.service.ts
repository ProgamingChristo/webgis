import type { SupabaseClient } from "@supabase/supabase-js";
import { parseObservedPrice } from "@/src/features/commuter/commuter-intent";
import { evaluateOpeningHours, openingHoursLabel, type OpeningStatus } from "@/src/features/commuter/opening-hours";

export interface CanonicalMerchantMapItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  longitude: number;
  latitude: number;
  walkingMinutes: number | null;
  distanceMeters: number | null;
  accessibilityScore: number;
  priceLabel: "Hemat" | "Sedang" | "Premium";
  openNow: boolean;
  source: string;
  sources: Array<"PREMIUM" | "MENU_GO" | "OWNER_SUBMITTED">;
  status: "surveyed" | "verified";
  updatedAt: string;
  limitation: string;
  address?: string;
  description?: string;
  phone?: string;
  photo?: string;
  logo?: string;
  facilities?: string[];
  paymentMethods?: string[];
  socialMedia?: { instagram?: string };
  menuItems?: PublicMenuItem[];
  openingHoursLabel?: string;
  referenceDistance?: { meters: number; label: string; kind: "STRAIGHT_LINE" };
  searchRelevance?: number;
  recommendation?: import("../global-search/recommendation-engine").RecommendationBreakdown;
  menuPhotos?: string[];
  menu?: string;
  observedPrice?: string;
  observedCondition?: string;
  mobility?: string;
  observedAt?: string;
  provenance: Record<string, unknown>;
  openStatusKnown: boolean;
  priceStatusKnown: boolean;
  observedPriceAmount: number | null;
  openingStatus: OpeningStatus;
  networkRouteStatus?: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS";
  networkDistanceMeters?: number;
  networkDurationSeconds?: number;
  regionIds: string[];
  regions: string[];
  city?: string;
  owner_id: string | null;
  publish_status: string;
  submitted_by: string | null;
  submission_id: string | null;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  photo_url?: string;
  is_available: boolean;
  tag?: string;
}

export interface CanonicalMerchantPage {
  merchants: CanonicalMerchantMapItem[];
  total: number;
}

export interface CanonicalMerchantViewportQuery {
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  limit: number;
  offset: number;
  keyword?: string | null;
  category?: string | null;
  regionIds?: string[];
  radiusMeters?: number;
  origin?: { longitude: number; latitude: number };
}

export class CanonicalMerchantReadService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async list(query: CanonicalMerchantViewportQuery): Promise<CanonicalMerchantPage> {
    const { data: pageRows, error: pageError } = await this.supabase.rpc(
      "search_canonical_merchants_v2",
      {
        p_west: query.west ?? null,
        p_south: query.south ?? null,
        p_east: query.east ?? null,
        p_north: query.north ?? null,
        p_limit: query.limit,
        p_offset: query.offset,
        p_region_ids: query.regionIds?.length ? query.regionIds : null,
        p_keyword: query.keyword ?? null,
        p_category: query.category ?? null,
        p_origin_lng: query.origin?.longitude ?? null,
        p_origin_lat: query.origin?.latitude ?? null,
        p_radius_meters: query.radiusMeters ?? null,
      },
    );
    if (pageError) throw pageError;

    const merchantIds = (pageRows ?? []).map((row: any) => row.merchant_id);
    const pageByMerchantId = new Map(
      (pageRows ?? []).map((row: any) => [row.merchant_id, row]),
    );
    let total = Number(pageRows?.[0]?.total_count ?? 0);

    // Complement RPC results with published owner-submitted merchants:
    // This ensures newly approved UMKM submissions appear in global search and on map viewports
    // even before batch reconciliation links them to external data provider tables.
    if (typeof this.supabase?.from === "function") {
      if (query.keyword?.trim()) {
        const kw = query.keyword.trim();
        const { data: directMatches } = await this.supabase
          .from("merchants")
          .select("id, name, address, description, location, publish_status")
          .eq("publish_status", "PUBLISHED")
          .or(`name.ilike.%${kw}%,description.ilike.%${kw}%,address.ilike.%${kw}%`)
          .limit(query.limit);

        if (directMatches && directMatches.length > 0) {
          for (const dm of directMatches) {
            if (!merchantIds.includes(dm.id)) {
              merchantIds.unshift(dm.id);
              pageByMerchantId.set(dm.id, {
                merchant_id: dm.id,
                total_count: total + directMatches.length,
                relevance_score: 400,
                region_ids: [],
                region_names: [],
                distance_meters: null,
              });
              total += 1;
            }
          }
        }
      } else if (query.west != null && query.south != null && query.east != null && query.north != null) {
        // Viewport query: check for published owner submissions within bounding box
        const { data: ownerMerchants } = await this.supabase
          .from("merchants")
          .select("id, name, location, publish_status")
          .eq("publish_status", "PUBLISHED")
          .not("owner_id", "is", null)
          .limit(100);

        if (ownerMerchants && ownerMerchants.length > 0) {
          for (const om of ownerMerchants) {
            const pt = readPoint(om.location);
            if (pt && pt[0] >= query.west! && pt[0] <= query.east! && pt[1] >= query.south! && pt[1] <= query.north!) {
              if (!merchantIds.includes(om.id)) {
                merchantIds.push(om.id);
                pageByMerchantId.set(om.id, {
                  merchant_id: om.id,
                  total_count: total + 1,
                  relevance_score: 100,
                  region_ids: [],
                  region_names: [],
                  distance_meters: null,
                });
                total += 1;
              }
            }
          }
        }
      }
    }

    if (merchantIds.length === 0) return { merchants: [], total };

    const { data: links, error: linksError } = await this.supabase
      .from("merchant_source_links")
      .select("merchant_id,source_table,source_record_id,confidence,metadata")
      .in("merchant_id", merchantIds)
      .in("source_table", [
        "mapid_premium_merchants",
        "mapid_mission_observations:MENU_GO",
      ])
      .range(0, 999);
    if (linksError) throw linksError;

    const menuSourceIds = (links ?? [])
      .filter((link: any) => link.source_table === "mapid_mission_observations:MENU_GO")
      .map((link: any) => link.source_record_id);

    const [merchants, observationResult, submissionResult] = await Promise.all([
      this.listMerchantsByIds(merchantIds),
      menuSourceIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : this.supabase
            .from("mapid_mission_observations")
            .select("source_record_id,normalized_properties,observed_at")
            .eq("source_type", "MENU_GO")
            .in("source_record_id", menuSourceIds)
            .range(0, 4_999),
      this.supabase
        .from("merchant_submissions")
        .select("id,submitted_by,canonical_merchant_id")
        .eq("status", "APPROVED")
        .in("canonical_merchant_id", merchantIds)
        .range(0, Math.max(merchantIds.length - 1, 0)),
    ]);
    if (observationResult.error) throw observationResult.error;
    const submissionByMerchantId = new Map<string, { id: string; submitted_by: string }>();
    if (!submissionResult.error) {
      for (const submission of submissionResult.data ?? []) {
        if (submission.canonical_merchant_id && !submissionByMerchantId.has(submission.canonical_merchant_id)) {
          submissionByMerchantId.set(submission.canonical_merchant_id, {
            id: submission.id,
            submitted_by: submission.submitted_by,
          });
        }
      }
    }

    const linksByMerchant = new Map<string, any[]>();
    for (const link of links ?? []) {
      linksByMerchant.set(link.merchant_id, [
        ...(linksByMerchant.get(link.merchant_id) ?? []),
        link,
      ]);
    }
    const observationBySourceId = new Map(
      (observationResult.data ?? []).map((row: any) => [row.source_record_id, row]),
    );

    const merchantById = new Map(merchants.map((merchant: any) => [merchant.id, merchant]));
    const mapped = merchantIds
      .map((merchantId: string) => merchantById.get(merchantId))
      .filter(Boolean)
      .map((merchant: any) => mapCanonicalMerchantRow(
        merchant,
        linksByMerchant.get(merchant.id) ?? [],
        observationBySourceId,
        pageByMerchantId.get(merchant.id),
        submissionByMerchantId.get(merchant.id) ?? null,
      ))
      .filter(
        (item: CanonicalMerchantMapItem | null): item is CanonicalMerchantMapItem =>
          item !== null,
      );

    return { merchants: mapped, total };
  }

  private async listMerchantsByIds(ids: string[]) {
    const rows: any[] = [];
    for (let offset = 0; offset < ids.length; offset += 150) {
      const { data, error } = await this.supabase
        .from("merchants")
        .select("id,name,description,location,address,price_level,opening_hours,is_mobile,verification_status,publish_status,data_quality_score,metadata,updated_at,owner_id")
        .in("id", ids.slice(offset, offset + 150))
        .eq("publish_status", "PUBLISHED")
        .range(0, 149);
      if (error) throw error;
      rows.push(...(data ?? []));
    }
    return rows;
  }
}

export function mapCanonicalMerchantRow(
  merchant: any,
  links: any[],
  observationBySourceId: Map<string, any>,
  searchRow?: any,
  ownerSubmission?: { id: string; submitted_by: string } | null,
): CanonicalMerchantMapItem | null {
  const point = readPoint(merchant.location);
  if (!point) return null;
  const metadata = asObject(merchant.metadata);
  const menuLinks = links.filter(
    (link) => link.source_table === "mapid_mission_observations:MENU_GO",
  );
  const latestObservation = menuLinks
    .map((link) => observationBySourceId.get(link.source_record_id))
    .filter(Boolean)
    .sort((left, right) => String(right.observed_at ?? "").localeCompare(
      String(left.observed_at ?? ""),
    ))[0];
  const observed = asObject(latestObservation?.normalized_properties);
  const openingStatus = evaluateOpeningHours(merchant.opening_hours);
  const observedPriceAmount = parseObservedPrice(observed.harga_rata_rata);
  const isOwnerSubmitted = ownerSubmission != null;
  const sources = [
    links.some((link) => link.source_table === "mapid_premium_merchants")
      ? "PREMIUM" as const
      : null,
    menuLinks.length > 0 ? "MENU_GO" as const : null,
    isOwnerSubmitted ? "OWNER_SUBMITTED" as const : null,
  ].filter((source): source is "PREMIUM" | "MENU_GO" | "OWNER_SUBMITTED" => source !== null);
  // Ownership on a published merchant is authoritative for its editable public profile.
  // Requiring the original approval timestamps made later owner edits invisible.
  const hasAuthoritativeOwnerProfile = merchant.publish_status === "PUBLISHED" && Boolean(merchant.owner_id);
  const ownerMetadata = hasAuthoritativeOwnerProfile ? metadata : {};
  const ownerMedia = asObject(ownerMetadata.public_media);
  const ownerPhoto = safePublicImage(ownerMedia.storefront_url);
  const ownerMenuItems = readPublicMenuItems(ownerMetadata.menu_items);
  const photo = ownerPhoto ?? safePublicImage(observed.foto_tempat);
  const menuPhotos = [
    ...ownerMenuItems.map((item) => item.photo_url),
    observed.foto_menu_1,
    observed.foto_menu_2,
  ].map(safePublicImage).filter((value): value is string => value !== undefined)
    .filter((value, index, values) => values.indexOf(value) === index);

  return {
    id: merchant.id,
    name: merchant.name,
    category: optionalString(metadata.category_label) ?? optionalString(metadata.category) ??
      optionalString(observed.jenis_tempat) ?? "Makanan dan Minuman",
    brand: optionalString(metadata.brand) ?? "Makanan dan Minuman",
    longitude: point[0],
    latitude: point[1],
    walkingMinutes: null,
    distanceMeters: searchRow?.distance_meters != null ? Math.round(Number(searchRow.distance_meters)) : null,
    accessibilityScore: merchant.data_quality_score ?? 80,
    priceLabel: toPriceLabel(merchant.price_level),
    openNow: openingStatus === "OPEN",
    openStatusKnown: openingStatus !== "UNKNOWN",
    openingStatus,
    openingHoursLabel: openingHoursLabel(merchant.opening_hours),
    searchRelevance: Number(searchRow?.relevance_score ?? 0),
    source: sources.join(" + "),
    sources,
    status: merchant.verification_status === "VERIFIED" ? "verified" : "surveyed",
    updatedAt: merchant.updated_at,
    limitation: merchant.is_mobile
      ? "Menu Go geometry is an observed mobile location, not a permanent address."
      : isOwnerSubmitted
        ? "Canonical merchant created from an owner-verified submission."
        : "Canonical merchant with auditable Premium and Menu Go source evidence.",
    address: merchant.address ?? undefined,
    description: optionalString(merchant.description),
    phone: optionalString(ownerMetadata.phone) ?? optionalString(metadata.phone),
    photo,
    logo: safePublicImage(ownerMedia.logo_url),
    facilities: readStringList(ownerMetadata.facilities),
    paymentMethods: readStringList(ownerMetadata.payment_methods),
    socialMedia: readSocialMedia(ownerMetadata.social_media),
    menuItems: ownerMenuItems.length > 0 ? ownerMenuItems : undefined,
    menuPhotos: menuPhotos.length > 0 ? menuPhotos : undefined,
    menu: optionalString(observed.menu_utama),
    observedPrice: optionalString(observed.harga_rata_rata),
    observedCondition: optionalString(observed.kondisi_tempat),
    mobility: optionalString(observed.mobilitas),
    observedAt: optionalString(latestObservation?.observed_at),
    provenance: {
      source_type: isOwnerSubmitted ? "OWNER_SUBMITTED" : sources.includes("PREMIUM") ? "PREMIUM" : "MENU_GO",
      attributes: {
        address: merchant.address ? "PREMIUM_OR_CANONICAL" : null,
        geometry: sources.includes("PREMIUM") ? "PREMIUM" : isOwnerSubmitted ? "OWNER_SUBMITTED" : "MENU_GO_OBSERVED_LOCATION",
        menu: observed.menu_utama ? "MENU_GO" : null,
        name: sources.includes("PREMIUM") ? "PREMIUM" : isOwnerSubmitted ? "OWNER_SUBMITTED" : "MENU_GO",
        observed_price: observed.harga_rata_rata ? "MENU_GO" : null,
        phone: metadata.phone ? "PREMIUM" : null,
        photo: ownerPhoto ? "APPROVED_OWNER_SUBMISSION" : photo ? "MENU_GO" : null,
      },
      source_record_ids: links.map((link) => ({
        source: link.source_table === "mapid_premium_merchants" ? "PREMIUM" : "MENU_GO",
        source_record_id: link.source_record_id,
      })),
    },
    priceStatusKnown: observedPriceAmount !== null,
    observedPriceAmount,
    regionIds: searchRow?.region_ids ?? [],
    regions: searchRow?.region_names ?? [],
    city: searchRow?.region_names?.[0] ?? undefined,
    owner_id: merchant.owner_id ?? null,
    publish_status: merchant.publish_status,
    submitted_by: ownerSubmission?.submitted_by ?? null,
    submission_id: ownerSubmission?.id ?? null,
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readPoint(value: unknown): [number, number] | null {
  if (
    typeof value === "object" && value !== null &&
    Array.isArray((value as { coordinates?: unknown }).coordinates)
  ) {
    const [longitude, latitude] = (value as { coordinates: unknown[] }).coordinates;
    if (typeof longitude === "number" && typeof latitude === "number") {
      return [longitude, latitude];
    }
  }
  if (typeof value === "string") {
    const match = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(value);
    if (match?.[1] && match?.[2]) return [Number(match[1]), Number(match[2])];
  }
  return null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map(optionalString).filter((item): item is string => item !== undefined);
  return items.length > 0 ? items : undefined;
}

function readSocialMedia(value: unknown): { instagram?: string } | undefined {
  const instagram = optionalString(asObject(value).instagram);
  return instagram ? { instagram } : undefined;
}

function readPublicMenuItems(value: unknown): PublicMenuItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): PublicMenuItem[] => {
    const item = asObject(raw);
    const id = optionalString(item.id);
    const name = optionalString(item.name);
    const price = typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0 ? item.price : null;
    if (!id || !name || price === null || typeof item.is_available !== "boolean") return [];
    const photoUrl = safePublicImage(item.photo_url);
    return [{
      id,
      name,
      price,
      ...(optionalString(item.category) ? { category: optionalString(item.category) } : {}),
      ...(optionalString(item.description) ? { description: optionalString(item.description) } : {}),
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      is_available: item.is_available,
      ...(optionalString(item.tag) ? { tag: optionalString(item.tag) } : {}),
    }];
  });
}

function toPriceLabel(value: string | null) {
  if (value?.toLowerCase() === "hemat") return "Hemat" as const;
  if (value?.toLowerCase() === "premium") return "Premium" as const;
  return "Sedang" as const;
}

function safePublicImage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}
