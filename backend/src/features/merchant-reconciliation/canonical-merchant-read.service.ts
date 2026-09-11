import type { SupabaseClient } from "@supabase/supabase-js";
import { parseObservedPrice } from "@/src/features/commuter/commuter-intent";
import { evaluateOpeningHours, type OpeningStatus } from "@/src/features/commuter/opening-hours";

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
  phone?: string;
  photo?: string;
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
  // Phase 16A: Canonical inventory + provenance
  /** UUID of the authenticated owner. null = no verified owner yet. */
  owner_id: string | null;
  /** publish_status from the merchants table. Only PUBLISHED merchants are surfaced in discovery. */
  publish_status: string;
  /** user_id of the person who submitted this merchant via merchant_submissions (OWNER_SUBMITTED provenance). null = surveyed/reconciled. */
  submitted_by: string | null;
  /** ID of the merchant_submission that created this canonical merchant. null = not owner-submitted. */
  submission_id: string | null;
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
  radiusMeters?: number | null;
  origin?: { longitude: number; latitude: number } | null;
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
        p_region_ids: query.regionIds?.length ? query.regionIds : null,
        p_keyword: query.keyword ?? null,
        p_category: query.category ?? null,
        p_limit: query.limit,
        p_offset: query.offset,
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
    const total = Number(pageRows?.[0]?.total_count ?? 0);
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

    // Phase 16A: Parallel fetch — observations + owner-submitted provenance
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
      // Resolve OWNER_SUBMITTED provenance: find approved submissions whose
      // canonical_merchant_id is in our result set.
      this.supabase
        .from("merchant_submissions")
        .select("id,submitted_by,canonical_merchant_id")
        .eq("status", "APPROVED")
        .in("canonical_merchant_id", merchantIds)
        .range(0, merchantIds.length - 1),
    ]);
    if (observationResult.error) throw observationResult.error;
    // Non-fatal: if submission provenance lookup fails, surface organic results without it.
    const submissionByMerchantId = new Map<string, { id: string; submitted_by: string }>();
    if (!submissionResult.error) {
      for (const sub of submissionResult.data ?? []) {
        if (sub.canonical_merchant_id && !submissionByMerchantId.has(sub.canonical_merchant_id)) {
          submissionByMerchantId.set(sub.canonical_merchant_id, {
            id: sub.id,
            submitted_by: sub.submitted_by,
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
        // Phase 16A: include owner_id and publish_status for canonical inventory
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
  // Phase 16A: owner-submitted provenance resolved from merchant_submissions join
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
  // Phase 16A: OWNER_SUBMITTED source type appears when the merchant was created
  // via an approved user submission. It is ADDITIVE — not a replacement for
  // PREMIUM or MENU_GO sources which describe the data evidence.
  const isOwnerSubmitted = ownerSubmission != null;
  const sources = [
    links.some((link) => link.source_table === "mapid_premium_merchants")
      ? "PREMIUM" as const
      : null,
    menuLinks.length > 0 ? "MENU_GO" as const : null,
    isOwnerSubmitted ? "OWNER_SUBMITTED" as const : null,
  ].filter((source): source is "PREMIUM" | "MENU_GO" | "OWNER_SUBMITTED" => source !== null);
  const photo = optionalString(observed.foto_tempat);
  const menuPhotos = [observed.foto_menu_1, observed.foto_menu_2]
    .map(optionalString)
    .filter((value): value is string => value !== undefined);

  return {
    id: merchant.id,
    name: merchant.name,
    category: optionalString(metadata.category) ??
      optionalString(observed.jenis_tempat) ??
      merchant.description ?? "Makanan dan Minuman",
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
    phone: optionalString(metadata.phone),
    photo,
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
        photo: observed.foto_tempat ? "MENU_GO" : null,
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
    // Phase 16A: canonical inventory fields
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
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        // fall through to regex match
      }
    }
  }
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

function toPriceLabel(value: string | null) {
  if (value?.toLowerCase() === "hemat") return "Hemat" as const;
  if (value?.toLowerCase() === "premium") return "Premium" as const;
  return "Sedang" as const;
}
