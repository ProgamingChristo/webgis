"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  Coffee,
  Database,
  Layers3,
  LocateFixed,
  LogOut,
  MapPinned,
  Megaphone,
  Phone,
  Route,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { StakeholderModeSwitcher } from "@/src/components/stakeholder/stakeholder-mode-switcher";
import { StakeholderContextShell } from "@/src/components/stakeholder/stakeholder-context-shell";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { GetraLogo } from "@/src/components/getra-ui";
import { AccountMenu } from "@/src/components/profile/account-menu";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { AiPanel } from "@/components/ai/ai-panel";
import { CommunityNotificationsMenu } from "@/src/features/community/components/notifications/community-notifications-menu";

import { GetraMap } from "@/components/getra-map";
import { useFairDiscovery, FairDiscoveryResults } from "@/src/features/fair-discovery";
import { useProfilePoster, ProfilePoster } from "@/src/features/umkm-advertising";
import { useRouting } from "@/src/hooks/use-routing";
import {
  mapidLayerService,
  type CanonicalMerchantLayer,
  type GlobalSearchIntent,
  type MapViewportBounds,
  type SearchRegion,
} from "@/src/services/mapid-layer.service";
import { GlobalSearchControls } from "@/src/features/global-search/components/global-search-controls";
import { RegionScopeSummary } from "@/src/features/administrative-boundaries/components/region-scope-summary";
import { useAdministrativeBoundaries } from "@/src/features/administrative-boundaries/hooks/use-administrative-boundaries";
import { groupMerchantsByRegion } from "@/src/features/administrative-boundaries/utils/administrative-boundary.utils";
import { useContextualLayers } from "@/src/features/mission-context-layers/hooks/use-contextual-layers";
import type { ContextualLayerKey } from "@/src/features/mission-context-layers/types/contextual-layer.types";
import {
  DEFAULT_CONTEXTUAL_LAYER_VISIBILITY,
  setContextualLayerVisibility,
} from "@/src/features/mission-context-layers/utils/contextual-layer.utils";
import {
  adminMapImportService,
  type AdminImportedLayer,
} from "@/src/services/admin-map-import.service";
import {
  COFFEE_SHOP_ORIGIN,
  COFFEE_SHOP_SOURCE_NAME,
  COFFEE_SHOPS,
} from "@/data/coffee-shops-jakarta-barat";
import { authenticatedFetch, clearAuthSession } from "@/src/lib/auth-client";
import { commuterService, type WalkingServiceArea } from "@/src/services/commuter.service";
import type { Merchant, UserLocation } from "@/types/getra";
import { useDemandIntelligence } from "@/src/features/demand-intelligence/hooks/use-demand-intelligence";
import { DemandIntelligencePanel } from "@/src/features/demand-intelligence/components/demand-intelligence-panel";
import type {
  AnalyticsCategorySlug,
  AnalyticsMapCollection,
  AnalyticsMode,
  AnalyticsQuery,
} from "@/src/features/demand-intelligence/types/demand-intelligence.types";
import { businessSpaceService } from "@/src/features/business-space/services/business-space.service";
import type {
  BusinessCategorySlug,
  BusinessSpaceCandidate,
  BusinessSpaceCandidateDetail,
} from "@/src/features/business-space/types/business-space.types";
import { accessibilityEvidenceService } from "@/src/features/accessibility-evidence/services/accessibility-evidence.service";
import type {
  AccessibilityEvidence,
  AccessibilityEvidenceCategory,
  AccessibilityEvidenceDetail,
  AccessibilityEvidenceSource,
  AccessibilityNeedSummary,
  AccessibilityValidationStatus,
} from "@/src/features/accessibility-evidence/types/accessibility-evidence.types";

type LocatedMerchant =
  Merchant & {
    userDistanceMeters?: number;
  };

type DatasetId =
  | "all-areas"
  | "admin-import"
  | `admin-import:${string}`
  | "coffee-jakarta-barat"
  | "mapid-food-jakarta-pusat";

type RouteSearchTarget =
  | "origin"
  | "destination";

const ROUTE_ORIGIN_USER = "user";

const ROUTE_ORIGIN_MANUAL = "manual";

const ROUTE_ORIGIN_NONE = "none";

const MAX_ROUTE_SEARCH_RESULTS =
  6;

const PROPERTY_REGION_OPTIONS = [
  { id: "", label: "Viewport aktif" },
  { id: "jakarta-selatan", label: "Jakarta Selatan" },
  { id: "jakarta-pusat", label: "Jakarta Pusat" },
  { id: "jakarta-barat", label: "Jakarta Barat" },
  { id: "jakarta-timur", label: "Jakarta Timur" },
  { id: "jakarta-utara", label: "Jakarta Utara" },
] as const;

const PROPERTY_BUSINESS_CATEGORIES: Array<{ value: BusinessCategorySlug; label: string }> = [
  { value: "bakso", label: "Bakso" },
  { value: "coffee", label: "Kopi / Kafe" },
  { value: "restaurant", label: "Restoran" },
  { value: "warung", label: "Warung" },
  { value: "minimarket", label: "Minimarket" },
];

const ACCESSIBILITY_SOURCE_OPTIONS: Array<{ value: "" | AccessibilityEvidenceSource; label: string }> = [
  { value: "", label: "Semua sumber" },
  { value: "MAPID_ACTIVITY", label: "MAPID Activities" },
  { value: "GETRA_COMMUNITY", label: "GETRA Community" },
];

const ACCESSIBILITY_CATEGORY_OPTIONS: Array<{ value: "" | AccessibilityEvidenceCategory; label: string }> = [
  { value: "", label: "Semua kategori" },
  { value: "ACCESSIBILITY_OBSERVATION", label: "Aksesibilitas" },
  { value: "PEDESTRIAN_OBSERVATION", label: "Pedestrian" },
  { value: "TRANSIT_OBSERVATION", label: "Transit" },
  { value: "UNCLASSIFIED", label: "Belum terklasifikasi" },
];

const ACCESSIBILITY_STATUS_OPTIONS: Array<{ value: "" | AccessibilityValidationStatus; label: string }> = [
  { value: "", label: "Semua status" },
  { value: "OBSERVED", label: "Observasi" },
  { value: "NEEDS_REVIEW", label: "Perlu verifikasi" },
  { value: "CONFIRMED", label: "Terkonfirmasi" },
  { value: "STALE", label: "Stale" },
];

const SAFE_MEDIA_HOSTS = new Set([
  "mapidstorage.cdn.mapid.io",
  "mapid-app-chat.cdn.mapid.io",
]);

function toAdminImportDatasetId(
  layerId: string,
): DatasetId {
  return `admin-import:${layerId}`;
}

function isAdminImportDataset(
  value: DatasetId,
): value is
  | "admin-import"
  | `admin-import:${string}` {
  const dataset = String(value);

  return (
    dataset ===
      "admin-import" ||
    dataset.startsWith(
      "admin-import:",
    )
  );
}

function getAdminImportLayerId(
  value: DatasetId,
) {
  return value.startsWith(
    "admin-import:",
  )
    ? value.replace(
        "admin-import:",
        "",
      )
    : null;
}

function distanceMeters(
  a: {
    latitude: number;
    longitude: number;
  },
  b: {
    latitude: number;
    longitude: number;
  },
) {
  const earthRadiusMeters =
    6371008.8;

  const toRad =
    (value: number) =>
      (value * Math.PI) /
      180;

  const dLat =
    toRad(
      b.latitude -
        a.latitude,
    );

  const dLng =
    toRad(
      b.longitude -
        a.longitude,
    );

  const lat1 =
    toRad(
      a.latitude,
    );

  const lat2 =
    toRad(
      b.latitude,
    );

  const h =
    Math.sin(
      dLat / 2,
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        dLng / 2,
      ) ** 2;

  return Math.round(
    earthRadiusMeters *
      2 *
      Math.atan2(
        Math.sqrt(h),
        Math.sqrt(
          1 - h,
        ),
      ),
  );
}

function formatDistance(
  meters: number,
) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function freshnessLabel(value: string | null | undefined) {
  if (value === "FRESH") return "Fresh";
  if (value === "AGING") return "Aging";
  if (value === "STALE") return "Perlu konfirmasi ulang";
  return "Freshness tidak diketahui";
}

function transactionLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("sewa")) return "Disewa";
  if (normalized.includes("jual")) return "Dijual";
  return "Tidak tersedia";
}

function accessibilityCategoryLabel(value: string | null | undefined) {
  switch (value) {
    case "ACCESSIBILITY_OBSERVATION":
      return "Observasi aksesibilitas";
    case "PEDESTRIAN_OBSERVATION":
      return "Observasi pedestrian";
    case "TRANSIT_OBSERVATION":
      return "Observasi transit";
    case "ECONOMIC_UMKM_OBSERVATION":
      return "Observasi ekonomi/UMKM";
    case "AREA_OBSERVATION":
      return "Observasi area";
    default:
      return "Temuan lapangan";
  }
}

function accessibilitySubcategoryLabel(value: string | null | undefined) {
  switch (value) {
    case "SIDEWALK":
      return "Trotoar";
    case "CROSSING":
      return "Penyeberangan";
    case "GUIDING_BLOCK":
      return "Guiding block";
    case "WHEELCHAIR_ACCESS":
      return "Akses kursi roda";
    case "OBSTRUCTION":
      return "Hambatan";
    case "SURFACE_CONDITION":
      return "Kondisi permukaan";
    case "TRANSIT_ACCESS":
      return "Akses transit";
    default:
      return "Observasi lain";
  }
}

function accessibilityStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "CONFIRMED":
      return "Terkonfirmasi";
    case "NEEDS_REVIEW":
      return "Perlu verifikasi";
    case "REVIEWED":
      return "Sudah ditinjau";
    case "REJECTED":
      return "Ditolak";
    case "STALE":
      return "Perlu konfirmasi ulang";
    default:
      return "Observasi";
  }
}

function accessibilitySourceLabel(value: string | null | undefined) {
  return value === "GETRA_COMMUNITY"
    ? "GETRA Community"
    : "MAPID Activities";
}

function formatNullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "Insufficient Data";
}

function isSafeMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && SAFE_MEDIA_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function formatMerchantSources(merchant: Merchant) {
  const sources = merchant.sources?.length
    ? merchant.sources
    : merchant.source.split("+").map((item) => item.trim()).filter(Boolean);
  if (sources.length === 0) return "Tidak tersedia";
  return sources.join(" + ");
}

function ensureSearchableBounds(bounds: MapViewportBounds): MapViewportBounds {
  const longitudePadding = bounds.east > bounds.west ? 0 : 0.015;
  const latitudePadding = bounds.north > bounds.south ? 0 : 0.015;
  return {
    west: bounds.west - longitudePadding,
    south: bounds.south - latitudePadding,
    east: bounds.east + longitudePadding,
    north: bounds.north + latitudePadding,
  };
}

function inferPropertyRegionId(query: string) {
  const normalized = query.toLowerCase();
  return PROPERTY_REGION_OPTIONS.find((region) =>
    region.id &&
    normalized.includes(region.label.toLowerCase())
  )?.id ?? "";
}

function inferPropertyTransactionType(query: string): "" | "DIJUAL" | "DISEWA" {
  const normalized = query.toLowerCase();
  if (normalized.includes("disewa") || normalized.includes("sewa")) return "DISEWA";
  if (normalized.includes("dijual") || normalized.includes("jual")) return "DIJUAL";
  return "";
}

function normalizePropertySearchKeyword(query: string) {
  let normalized = query;
  for (const region of PROPERTY_REGION_OPTIONS) {
    if (region.id) {
      normalized = normalized.replace(new RegExp(region.label, "ig"), " ");
    }
  }
  normalized = normalized
    .replace(/\bproperti\b/gi, " ")
    .replace(/\bdi\s*sewa\b/gi, " ")
    .replace(/\bdisewa\b/gi, " ")
    .replace(/\bdi\s*jual\b/gi, " ")
    .replace(/\bdijual\b/gi, " ")
    .replace(/\bsewa\b/gi, " ")
    .replace(/\bjual\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized;
}

function MerchantResultRow({
  merchant,
  index,
  selected,
  onSelect,
}: {
  merchant: LocatedMerchant;
  index: number;
  selected: boolean;
  onSelect: (merchant: LocatedMerchant) => void;
}) {
  const area = [merchant.district, merchant.city ?? merchant.regions?.[0]]
    .filter((value, areaIndex, values) => value && values.indexOf(value) === areaIndex)
    .join(", ");

  return (
    <button
      className={selected ? "result-row result-row--selected" : "result-row"}
      onClick={() => onSelect(merchant)}
      type="button"
    >
      <span className="result-rank">{index + 1}</span>
      <span className="result-main">
        <strong>{merchant.name}</strong>
        <span>{[merchant.brand, area].filter(Boolean).join(" - ")}</span>
        <span className="result-meta">
          {merchant.userDistanceMeters !== undefined ? (
            <>
              <LocateFixed size={13} />
              Jarak langsung {formatDistance(merchant.userDistanceMeters)}
              {merchant.networkDurationSeconds ? (
                <><span>-</span>{Math.ceil(merchant.networkDurationSeconds / 60)} menit jaringan</>
              ) : null}
            </>
          ) : (
            <>
              <MapPinned size={13} />
              {merchant.latitude.toFixed(6)}, {merchant.longitude.toFixed(6)}
            </>
          )}
        </span>
      </span>
      <span className="score-box">
        <strong>
          {merchant.openingStatus === "OPEN" || (merchant.openStatusKnown && merchant.openNow)
            ? "BUKA"
            : merchant.openingStatus === "CLOSED" || (merchant.openStatusKnown && !merchant.openNow)
              ? "TUTUP"
              : "N/A"}
        </strong>
        <span>status</span>
      </span>
    </button>
  );
}

function PropertyResultRow({
  candidate,
  index,
  selected,
  onSelect,
}: {
  candidate: BusinessSpaceCandidate;
  index: number;
  selected: boolean;
  onSelect: (candidate: BusinessSpaceCandidate) => void;
}) {
  return (
    <button
      className={selected ? "result-row result-row--selected property-result-row" : "result-row property-result-row"}
      onClick={() => onSelect(candidate)}
      type="button"
    >
      <span className="result-rank">P{index + 1}</span>
      <span className="result-main">
        <strong>{candidate.property_category ?? "Observasi properti"}</strong>
        <span>{[candidate.property_transaction_type, candidate.address].filter(Boolean).join(" - ") || "Alamat tidak tersedia"}</span>
        <span className="result-meta">
          <Building2 size={13} />
          Sumber: Properti Go - {freshnessLabel(candidate.freshness)}
        </span>
      </span>
      <span className="score-box">
        <strong>{transactionLabel(candidate.property_transaction_type)}</strong>
        <span>jenis</span>
      </span>
    </button>
  );
}

function SafeMediaImage({
  alt,
  src,
}: {
  alt: string;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed || !isSafeMediaUrl(src)) {
    return (
      <div className="safe-media-placeholder" role="img" aria-label={`${alt} tidak tersedia`}>
        Tidak ada foto
      </div>
    );
  }
  return (
    <Image
      alt={alt}
      className="safe-media-image"
      height={240}
      loading="lazy"
      referrerPolicy="no-referrer"
      src={src}
      unoptimized
      width={320}
      onError={() => setFailed(true)}
    />
  );
}

function PropertyObservationDetail({
  detail,
  fallback,
  loading,
}: {
  detail: BusinessSpaceCandidateDetail | null;
  fallback: BusinessSpaceCandidate | null;
  loading: boolean;
}) {
  const candidate = detail?.candidate ?? fallback;
  if (!candidate) {
    return <div className="empty-state">Pilih observasi Properti Go pada peta atau daftar hasil.</div>;
  }
  return (
    <>
      <div className="detail-title">
        <span className="source-stamp source-stamp--warning">PROPERTI GO</span>
        <h3>{candidate.property_category ?? "Observasi properti"}</h3>
        <p>{transactionLabel(candidate.property_transaction_type)} - {candidate.address ?? "Alamat tidak tersedia"}</p>
      </div>
      <div className="media-gallery media-gallery--property">
        <SafeMediaImage alt="Foto tampak depan properti" src={candidate.facade_photo_url} />
        <SafeMediaImage alt="Foto spanduk properti" src={candidate.banner_photo_url} />
      </div>
      <section className="evidence-section">
        <h4>Property observation detail</h4>
        <dl className="evidence-list evidence-list--compact">
          <OptionalDetail label="Kategori properti" value={candidate.property_category} />
          <OptionalDetail label="Jenis" value={transactionLabel(candidate.property_transaction_type)} />
          <OptionalDetail label="Alamat" value={candidate.address} />
          <OptionalDetail label="Observed at" value={candidate.observed_at} />
          <OptionalDetail label="Freshness" value={freshnessLabel(candidate.freshness)} />
          <OptionalDetail label="Region" value={detail?.administrative_context.region_name} />
          <OptionalDetail label="Sumber" value="Properti Go" />
        </dl>
      </section>
      <section className="evidence-section">
        <h4>Analisis lokasi usaha</h4>
        {loading ? (
          <p className="limitation-box" role="status">Menghitung Business Space context...</p>
        ) : detail ? (
          <dl className="evidence-list evidence-list--compact">
            <OptionalDetail label="Demand" value={formatNullableNumber(detail.market_context.demand_score)} />
            <OptionalDetail label="Supply" value={formatNullableNumber(detail.market_context.supply_score)} />
            <OptionalDetail label="Retail Gap" value={formatNullableNumber(detail.market_context.retail_gap)} />
            <OptionalDetail label="Transit" value={detail.transit_context.nearest ? `${detail.transit_context.nearest.network_walking_minutes} menit jaringan` : "Tidak tersedia"} />
            <OptionalDetail label="Walking" value={detail.walking_context.status === "ROUTABLE" ? `${detail.walking_context.catchment_minutes} menit network` : "Tidak tersedia"} />
          </dl>
        ) : (
          <p className="limitation-box">Klik observasi untuk membuka konteks Business Space. Tidak ada klaim ketersediaan saat ini.</p>
        )}
      </section>
      <section className="evidence-section">
        <h4>Catatan</h4>
        <p className="limitation-box">Properti Go adalah observasi sumber. Ketersediaan jual/sewa harus dikonfirmasi ulang.</p>
      </section>
    </>
  );
}

function AccessibilityEvidenceResultRow({
  evidence,
  index,
  selected,
  onSelect,
}: {
  evidence: AccessibilityEvidence;
  index: number;
  selected: boolean;
  onSelect: (evidence: AccessibilityEvidence) => void;
}) {
  return (
    <button
      className={selected ? "result-row result-row--selected accessibility-result-row" : "result-row accessibility-result-row"}
      onClick={() => onSelect(evidence)}
      type="button"
    >
      <span className="result-rank">A{index + 1}</span>
      <span className="result-main">
        <strong>{evidence.title ?? accessibilityCategoryLabel(evidence.category)}</strong>
        <span>{accessibilitySubcategoryLabel(evidence.subcategory)} - {accessibilityStatusLabel(evidence.validation_status)}</span>
        <span className="result-meta">
          <ShieldCheck size={13} />
          {accessibilitySourceLabel(evidence.source_type)} - {freshnessLabel(evidence.freshness_status)}
        </span>
      </span>
      <span className="score-box">
        <strong>{evidence.routing_effect_enabled ? "ON" : "OFF"}</strong>
        <span>routing</span>
      </span>
    </button>
  );
}

function AccessibilityEvidenceDetailPanel({
  detail,
  fallback,
  loading,
}: {
  detail: AccessibilityEvidenceDetail | null;
  fallback: AccessibilityEvidence | null;
  loading: boolean;
}) {
  const evidence = detail ?? fallback;
  if (!evidence) {
    return <div className="empty-state">Pilih observasi aksesibilitas pada peta atau daftar evidence.</div>;
  }
  return (
    <>
      <div className="detail-title">
        <span className="source-stamp source-stamp--warning">
          {accessibilitySourceLabel(evidence.source_type)}
        </span>
        <h3>{evidence.title ?? accessibilityCategoryLabel(evidence.category)}</h3>
        <p>{accessibilitySubcategoryLabel(evidence.subcategory)} - {accessibilityStatusLabel(evidence.validation_status)}</p>
      </div>
      {evidence.media_urls.length > 0 ? (
        <section className="evidence-section">
          <h4>Foto observasi</h4>
          <div className="media-gallery">
            {evidence.media_urls.map((url, index) => (
              <SafeMediaImage
                key={url}
                alt={index === 0 ? "Foto observasi aksesibilitas" : "Foto observasi lapangan"}
                src={url}
              />
            ))}
          </div>
        </section>
      ) : null}
      <section className="evidence-section">
        <h4>Observasi aksesibilitas</h4>
        <dl className="evidence-list evidence-list--compact">
          <OptionalDetail label="Kategori" value={accessibilityCategoryLabel(evidence.category)} />
          <OptionalDetail label="Subkategori" value={accessibilitySubcategoryLabel(evidence.subcategory)} />
          <OptionalDetail label="Status" value={accessibilityStatusLabel(evidence.validation_status)} />
          <OptionalDetail label="Freshness" value={freshnessLabel(evidence.freshness_status)} />
          <OptionalDetail label="Observed at" value={evidence.observed_at} />
          <OptionalDetail label="Sumber" value={accessibilitySourceLabel(evidence.source_type)} />
          <OptionalDetail label="Deskripsi" value={evidence.description} />
        </dl>
      </section>
      <section className="evidence-section">
        <h4>Hubungan jaringan kandidat</h4>
        {loading ? (
          <p className="limitation-box" role="status">Memeriksa kandidat jaringan pedestrian...</p>
        ) : detail?.spatial_relation ? (
          <dl className="evidence-list evidence-list--compact">
            <OptionalDetail label="Tipe fitur" value="Pedestrian edge" />
            <OptionalDetail label="Jarak kandidat" value={`${detail.spatial_relation.distance_m} m`} />
            <OptionalDetail label="Status relasi" value={detail.spatial_relation.relation_status} />
            <OptionalDetail label="Routing effect" value="Tidak aktif pada Phase 12" />
          </dl>
        ) : (
          <p className="limitation-box">Belum ada kandidat jaringan dalam batas jarak aman. Evidence tetap tidak mengubah rute.</p>
        )}
      </section>
      <section className="evidence-section">
        <h4>Batas klaim</h4>
        <p className="limitation-box">
          Evidence ini adalah temuan lapangan atau kontribusi terkurasi. Phase 12 tidak menyatakan rute berbahaya dan tidak mengubah biaya pgRouting.
        </p>
      </section>
    </>
  );
}

function MerchantMediaGallery({ merchant }: { merchant: Merchant }) {
  const items = [
    { label: "Foto tempat merchant", src: merchant.photo },
    ...(merchant.menuPhotos ?? []).slice(0, 2).map((src, index) => ({
      label: `Foto menu merchant ${index + 1}`,
      src,
    })),
  ];
  if (!items.some((item) => item.src && isSafeMediaUrl(item.src))) return null;
  return (
    <section className="evidence-section">
      <h4>Foto dan menu</h4>
      <div className="media-gallery">
        {items.map((item) => (
          <SafeMediaImage key={item.label} alt={item.label} src={item.src} />
        ))}
      </div>
    </section>
  );
}

function MerchantSourceEvidence({ merchant }: { merchant: Merchant }) {
  const hasMenuGo = merchant.sources?.includes("MENU_GO") || merchant.source.includes("MENU_GO");
  return (
    <section className="evidence-section">
      <h4>Sumber data</h4>
      <p className="limitation-box">Sumber data: {formatMerchantSources(merchant)}</p>
      {hasMenuGo ? (
        <dl className="evidence-list evidence-list--compact">
          <OptionalDetail label="Menu utama" value={merchant.menu} />
          <OptionalDetail label="Harga observasi" value={merchant.observedPrice} />
          <OptionalDetail label="Kondisi tempat" value={merchant.observedCondition} />
          <OptionalDetail label="Mobilitas" value={merchant.mobility} />
          <OptionalDetail label="Observed at" value={merchant.observedAt} />
        </dl>
      ) : null}
    </section>
  );
}

function OptionalDetail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getMerchantAreaLine(
  merchant: Merchant,
) {
  return [
    merchant.address,
    merchant.village,
    merchant.district,
    merchant.city,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getMerchantSearchText(
  merchant: Merchant,
) {
  return [
    merchant.name,
    merchant.brand,
    merchant.category,
    merchant.address,
    merchant.village,
    merchant.district,
    merchant.city,
    merchant.province,
    merchant.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findRouteSearchResults(
  merchants: Merchant[],
  search: string,
) {
  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  if (
    normalizedSearch.length === 0
  ) {
    return [];
  }

  const source =
    merchants.filter(
      (merchant) =>
        getMerchantSearchText(
          merchant,
        ).includes(
          normalizedSearch,
        ),
    );

  return source.slice(
    0,
    MAX_ROUTE_SEARCH_RESULTS,
  );
}

function deduplicateMerchants(merchants: Merchant[]): Merchant[] {
  return [...new Map(merchants.map((merchant) => [merchant.id, merchant])).values()];
}

function calculateMerchantBounds(
  merchants: Merchant[],
) {
  if (merchants.length === 0) {
    return {
      west:
        COFFEE_SHOP_ORIGIN.longitude - 0.03,
      south:
        COFFEE_SHOP_ORIGIN.latitude - 0.03,
      east:
        COFFEE_SHOP_ORIGIN.longitude + 0.03,
      north:
        COFFEE_SHOP_ORIGIN.latitude + 0.03,
    };
  }

  return merchants.reduce(
    (
      bounds,
      merchant,
    ) => ({
      west:
        Math.min(
          bounds.west,
          merchant.longitude,
        ),
      south:
        Math.min(
          bounds.south,
          merchant.latitude,
        ),
      east:
        Math.max(
          bounds.east,
          merchant.longitude,
        ),
      north:
        Math.max(
          bounds.north,
          merchant.latitude,
        ),
    }),
    {
      west:
        merchants[0]?.longitude ??
        COFFEE_SHOP_ORIGIN.longitude,
      south:
        merchants[0]?.latitude ??
        COFFEE_SHOP_ORIGIN.latitude,
      east:
        merchants[0]?.longitude ??
        COFFEE_SHOP_ORIGIN.longitude,
      north:
        merchants[0]?.latitude ??
        COFFEE_SHOP_ORIGIN.latitude,
    },
  );
}

function calculateMerchantOrigin(
  merchants: Merchant[],
  fallback: {
    name: string;
    longitude: number;
    latitude: number;
  } = COFFEE_SHOP_ORIGIN,
) {
  const bounds =
    calculateMerchantBounds(
      merchants,
    );

  return {
    id:
      "active-dataset-center",
    name:
      fallback.name,
    longitude:
      (bounds.west + bounds.east) /
      2,
    latitude:
      (bounds.south + bounds.north) /
      2,
  };
}

export function GetraDashboard() {
  const router =
    useRouter();

  const {
    context: authContext,
  } = useAuth();

  const { activeExperience } = useStakeholder();

  const isAdmin =
    authContext?.profile
      ?.account_role ===
    "ADMIN";

  const isUmkm =
    authContext?.stakeholder_modes?.includes("UMKM") ||
    activeExperience === "UMKM";

  const [
    datasetId,
    setDatasetId,
  ] =
    useState<DatasetId>(
      "all-areas",
    );

  const canonicalRequestRef = useRef<AbortController | null>(null);

  const [
    mapidMerchants,
    setMapidMerchants,
  ] =
    useState<Merchant[]>(
      [],
    );

  const [canonicalViewportLoaded, setCanonicalViewportLoaded] = useState(false);

  const [
    mapidLayerName,
    setMapidLayerName,
  ] =
    useState(
      "Makanan dan Minuman Jakarta Pusat",
    );

  const [
    mapidLoading,
    setMapidLoading,
  ] =
    useState(false);

  const [
    mapidError,
    setMapidError,
  ] =
    useState<string | null>(
      null,
    );

  const [searchIntent, setSearchIntent] = useState<GlobalSearchIntent | null>(null);
  const [searchRegions, setSearchRegions] = useState<SearchRegion[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [mapMovedSinceSearch, setMapMovedSinceSearch] = useState(false);
  const [searchFocusBounds, setSearchFocusBounds] = useState<MapViewportBounds | null>(null);
  const [searchFocusKey, setSearchFocusKey] = useState(0);
  const [mapViewport, setMapViewport] = useState<MapViewportBounds | null>(null);
  const [maxBudget, setMaxBudget] = useState("");
  const [maxWalkingMinutes, setMaxWalkingMinutes] = useState<number | null>(null);
  const [serviceArea, setServiceArea] = useState<WalkingServiceArea | null>(null);
  const [serviceAreaLoading, setServiceAreaLoading] = useState(false);
  const serviceAreaRequestRef = useRef<AbortController | null>(null);
  const [contextualLayerVisibility, setContextualLayerVisibilityState] = useState(
    DEFAULT_CONTEXTUAL_LAYER_VISIBILITY,
  );
  const currentViewportRef = useRef<MapViewportBounds | null>(null);
  const activeSearchRef = useRef(false);
  const suppressNextViewportRef = useRef(false);

  const [
    adminImportedLayer,
    setAdminImportedLayer,
  ] =
    useState<AdminImportedLayer | null>(
      null,
    );

  const [
    adminImportedLayers,
    setAdminImportedLayers,
  ] =
    useState<AdminImportedLayer[]>(
      [],
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    brand,
    setBrand,
  ] =
    useState<string>(
      "Semua",
    );

  const [
    openOnly,
    setOpenOnly,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [mapPickMode, setMapPickMode] = useState<"NONE" | "ROUTE_START">("NONE");
  const [manualRouteStart, setManualRouteStart] = useState<{ latitude: number; longitude: number } | null>(null);

  const [
    locating,
    setLocating,
  ] =
    useState(false);

  const [
    locationError,
    setLocationError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    userLocation,
    setUserLocation,
  ] =
    useState<UserLocation | null>(
      null,
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    routeOriginValue,
    setRouteOriginValue,
  ] =
    useState<string>(
      ROUTE_ORIGIN_NONE,
    );

  const [explicitRouteOrigin, setExplicitRouteOrigin] = useState<{
    id: string;
    label: string;
    coordinate: { latitude: number; longitude: number };
  } | null>(null);

  const [
    routeDestinationId,
    setRouteDestinationId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    originSearch,
    setOriginSearch,
  ] =
    useState("");

  const [
    destinationSearch,
    setDestinationSearch,
  ] =
    useState("");

  const [
    pendingRouteChoice,
    setPendingRouteChoice,
  ] =
    useState<{
      target: RouteSearchTarget;
      merchant: Merchant;
    } | null>(null);

  const {
    state: routingState,
    route,
    error: routingError,
    requestRoute,
    clearRoute,
  } = useRouting();

  const allMerchants =
    useMemo(
      () => deduplicateMerchants([
        ...(adminImportedLayer?.merchants ??
          []),
        ...mapidMerchants,
        ...COFFEE_SHOPS,
      ]),
      [
        adminImportedLayer,
        mapidMerchants,
      ],
    );

  const activeAdminImportedLayer =
    useMemo(() => {
      const layerId =
        getAdminImportLayerId(
          datasetId,
        );

      if (!layerId) {
        return null;
      }

      return (
        adminImportedLayers.find(
          (layer) =>
            layer.layer_id ===
            layerId,
        ) ?? null
      );
    }, [
      adminImportedLayers,
      datasetId,
    ]);

  const fallbackAdminImportedMerchants =
    adminImportedLayer?.merchants;

  const baseMerchants =
    useMemo(
      () =>
        datasetId ===
          "all-areas"
          ? searchActive
            ? mapidMerchants
            : canonicalViewportLoaded
              ? mapidMerchants
              : allMerchants
          : isAdminImportDataset(
              datasetId,
            )
            ? activeAdminImportedLayer
                ?.merchants ??
              fallbackAdminImportedMerchants ??
              []
            : datasetId ===
                "mapid-food-jakarta-pusat"
              ? mapidMerchants
              : COFFEE_SHOPS,
      [
        activeAdminImportedLayer,
        allMerchants,
        canonicalViewportLoaded,
        datasetId,
        fallbackAdminImportedMerchants,
        mapidMerchants,
        searchActive,
      ],
    );

  const datasetTitle =
    datasetId ===
      "all-areas"
      ? "Semua data lokasi GETRA"
      : isAdminImportDataset(
          datasetId,
        )
        ? activeAdminImportedLayer
            ?.layer_name ??
          adminImportedLayer
            ?.layer_name ??
          "Layer import database"
        : datasetId ===
          "mapid-food-jakarta-pusat"
        ? "Makanan-minuman Jakarta Pusat"
        : "Coffee shop Jakarta Barat";

  const datasetSourceName =
    datasetId ===
      "all-areas"
      ? [
          adminImportedLayer
            ? adminImportedLayer.layer_name
            : null,
          mapidLayerName,
          COFFEE_SHOP_SOURCE_NAME,
        ]
          .filter(Boolean)
          .join(" + ")
      : isAdminImportDataset(
          datasetId,
        )
        ? activeAdminImportedLayer
            ?.limitation ??
          adminImportedLayer
            ?.limitation ??
          "Layer import database"
        : datasetId ===
          "mapid-food-jakarta-pusat"
        ? mapidLayerName
        : COFFEE_SHOP_SOURCE_NAME;

  const datasetOrigin =
    useMemo(
      () =>
        datasetId ===
        "all-areas"
          ? {
              ...calculateMerchantOrigin(
                allMerchants,
                {
                  ...COFFEE_SHOP_ORIGIN,
                  name:
                    "Pusat sebaran semua data GETRA",
                },
              ),
              name:
                "Pusat sebaran semua data GETRA",
            }
          : datasetId ===
              "mapid-food-jakarta-pusat"
            ? {
                ...calculateMerchantOrigin(
                  mapidMerchants,
                  {
                    ...COFFEE_SHOP_ORIGIN,
                    name:
                      "Pusat sebaran makanan-minuman Jakarta Pusat",
                  },
                ),
                name:
                  "Pusat sebaran makanan-minuman Jakarta Pusat",
              }
            : isAdminImportDataset(
                datasetId,
              )
            ? {
                ...calculateMerchantOrigin(
                  activeAdminImportedLayer
                    ?.merchants ??
                    adminImportedLayer
                      ?.merchants ??
                    [],
                  {
                    ...COFFEE_SHOP_ORIGIN,
                    name:
                      `Pusat sebaran ${
                        activeAdminImportedLayer
                          ?.layer_name ??
                        adminImportedLayer
                          ?.layer_name ??
                        "layer import"
                      }`,
                  },
                ),
                name:
                  `Pusat sebaran ${
                    activeAdminImportedLayer
                      ?.layer_name ??
                    adminImportedLayer
                      ?.layer_name ??
                    "layer import"
                  }`,
              }
            : COFFEE_SHOP_ORIGIN,
      [
        activeAdminImportedLayer,
        adminImportedLayer,
        allMerchants,
        datasetId,
        mapidMerchants,
      ],
    );

  const [primaryMode, setPrimaryMode] = useState<"merchant" | "business-space" | "accessibility">("merchant");
  const [viewMode, setViewMode] = useState<"fair-discovery" | "dataset" | "analytics">("dataset");
  const [analyticsMode, setAnalyticsMode] = useState<AnalyticsMode>("DEMAND");
  const [analyticsCategory, setAnalyticsCategory] = useState<AnalyticsCategorySlug>("coffee");
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30>(30);
  const [selectedAnalyticsRegionId, setSelectedAnalyticsRegionId] = useState<string | null>(null);
  const [propertyQuery, setPropertyQuery] = useState("");
  const [propertyRegionId, setPropertyRegionId] = useState<string>("");
  const [propertyBusinessCategory, setPropertyBusinessCategory] = useState<BusinessCategorySlug>("bakso");
  const [propertyCategory, setPropertyCategory] = useState("");
  const [propertyTransactionType, setPropertyTransactionType] = useState<"" | "DIJUAL" | "DISEWA">("");
  const [propertyCandidates, setPropertyCandidates] = useState<BusinessSpaceCandidate[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyDetail, setSelectedPropertyDetail] = useState<BusinessSpaceCandidateDetail | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const propertyRequestRef = useRef<AbortController | null>(null);
  const propertyDetailRequestRef = useRef<AbortController | null>(null);
  const [accessibilitySource, setAccessibilitySource] = useState<"" | AccessibilityEvidenceSource>("");
  const [accessibilityCategory, setAccessibilityCategory] = useState<"" | AccessibilityEvidenceCategory>("ACCESSIBILITY_OBSERVATION");
  const [accessibilityStatus, setAccessibilityStatus] = useState<"" | AccessibilityValidationStatus>("");
  const [accessibilityDays, setAccessibilityDays] = useState<30 | 90 | 0>(90);
  const [accessibilityEvidence, setAccessibilityEvidence] = useState<AccessibilityEvidence[]>([]);
  const [accessibilityNeed, setAccessibilityNeed] = useState<AccessibilityNeedSummary | null>(null);
  const [selectedAccessibilityEvidenceId, setSelectedAccessibilityEvidenceId] = useState<string | null>(null);
  const [selectedAccessibilityEvidenceDetail, setSelectedAccessibilityEvidenceDetail] = useState<AccessibilityEvidenceDetail | null>(null);
  const [accessibilityLoading, setAccessibilityLoading] = useState(false);
  const [accessibilityDetailLoading, setAccessibilityDetailLoading] = useState(false);
  const [accessibilityError, setAccessibilityError] = useState<string | null>(null);
  const accessibilityRequestRef = useRef<AbortController | null>(null);
  const accessibilityDetailRequestRef = useRef<AbortController | null>(null);

  const discoveryQuery = useMemo(() => {
    const origin = userLocation
      ? { longitude: userLocation.longitude, latitude: userLocation.latitude }
      : { longitude: datasetOrigin.longitude, latitude: datasetOrigin.latitude };

    return {
      origin,
      radiusMeters: 3000,
      category: brand !== "Semua" ? brand : undefined,
      query: query || undefined,
      openNow: openOnly,
    };
  }, [userLocation, datasetOrigin, brand, query, openOnly]);

  const {
    result: fairDiscoveryResult,
    isLoading: fairDiscoveryLoading,
    error: fairDiscoveryError,
  } = useFairDiscovery({
    query: discoveryQuery,
    enabled: viewMode === "fair-discovery" && !searchActive,
  });

  const datasetBounds =
    useMemo(
      () =>
        calculateMerchantBounds(
          baseMerchants,
        ),
      [
        baseMerchants,
      ],
    );

  const analyticsQuery = useMemo<AnalyticsQuery>(() => ({
    mode: analyticsMode,
    category: analyticsCategory,
    days: analyticsDays,
    region_ids: selectedRegionIds,
    bbox: selectedRegionIds.length === 0 ? (mapViewport ?? datasetBounds) : null,
  }), [analyticsCategory, analyticsDays, analyticsMode, datasetBounds, mapViewport, selectedRegionIds]);
  const analytics = useDemandIntelligence(viewMode === "analytics", analyticsQuery);

  const effectiveAnalyticsRegionId = analytics.data?.rows.some(
    (row) => row.spatial_unit.id === selectedAnalyticsRegionId,
  ) ? selectedAnalyticsRegionId : analytics.data?.rows[0]?.spatial_unit.id ?? null;

  const analyticsCollection = useMemo<AnalyticsMapCollection | null>(() => {
    if (viewMode !== "analytics" || !analytics.data) return null;
    return {
      type: "FeatureCollection",
      features: analytics.data.rows.map((row) => ({
        type: "Feature",
        id: row.spatial_unit.id,
        geometry: row.spatial_unit.geometry,
        properties: {
          region_id: row.spatial_unit.id,
          region_name: row.spatial_unit.name,
          category_name: analytics.data!.category.name,
          demand_score: row.demand_score,
          supply_score: row.supply_score,
          retail_gap: row.retail_gap,
          sample_size: row.evidence.sample_size,
          confidence: row.evidence.confidence,
          selected: row.spatial_unit.id === effectiveAnalyticsRegionId,
        },
      })),
    };
  }, [analytics.data, effectiveAnalyticsRegionId, viewMode]);

  const visibleImportBoundaries =
    isAdminImportDataset(datasetId)
      ? activeAdminImportedLayer?.boundaries ?? null
      : null;

  const visibleAdminBoundaryIds =
    useMemo(
      () => {
        if (datasetId === "all-areas") {
          return null;
        }

        if (datasetId === "mapid-food-jakarta-pusat") {
          return ["jakarta-pusat"];
        }

        if (datasetId === "coffee-jakarta-barat") {
          return ["jakarta-barat"];
        }

        if (isAdminImportDataset(datasetId)) {
          const regionIds = (activeAdminImportedLayer?.regions ?? [])
            .map((region) => region.id)
            .filter(Boolean);

          if (regionIds.length > 0) {
            return regionIds;
          }

          const layerTitle = (
            activeAdminImportedLayer?.layer_name ||
            adminImportedLayer?.layer_name ||
            ""
          ).toLowerCase();

          if (layerTitle.includes("utara") || layerTitle.includes("jakut")) {
            return ["jakarta-utara"];
          }
          if (layerTitle.includes("barat") || layerTitle.includes("jakbar")) {
            return ["jakarta-barat"];
          }
          if (layerTitle.includes("pusat") || layerTitle.includes("jakpus")) {
            return ["jakarta-pusat"];
          }
          if (layerTitle.includes("selatan") || layerTitle.includes("jaksel")) {
            return ["jakarta-selatan"];
          }
          if (layerTitle.includes("timur") || layerTitle.includes("jaktim")) {
            return ["jakarta-timur"];
          }

          return null;
        }

        return [];
      },
      [
        datasetId,
        activeAdminImportedLayer,
        adminImportedLayer,
      ],
    );

  const boundaryRegionIds =
    searchActive
      ? selectedRegionIds
      : visibleAdminBoundaryIds ?? [];

  const {
    boundaries: administrativeBoundaries,
    loading: boundaryLoading,
    error: boundaryError,
  } = useAdministrativeBoundaries(boundaryRegionIds);
  const contextualLayerData = useContextualLayers(
    mapViewport,
    contextualLayerVisibility,
  );
  const visibleAdministrativeBoundaries = contextualLayerVisibility.boundary
    ? administrativeBoundaries
    : { type: "FeatureCollection" as const, features: [] };

  const brandOptions =
    useMemo(
      () => [
        "Semua",
        ...Array.from(
          new Set(
            baseMerchants.map(
              (merchant) =>
                merchant.brand,
            ),
          ),
        ).sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              "id",
            ),
        ),
      ],
      [
        baseMerchants,
      ],
    );

  const merchants =
    useMemo(() => {
      const filtered =
        baseMerchants
        .filter((merchant) => {
          if (
            brand !==
              "Semua" &&
            merchant.brand !==
              brand
          ) {
            return false;
          }

          if (
            openOnly &&
            (!merchant.openStatusKnown || !merchant.openNow)
          ) {
            return false;
          }

          return true;
        });

      const withDistance: LocatedMerchant[] =
        userLocation
          ? filtered.map(
              (
                merchant,
              ) => {
                const userDistanceMeters =
                  distanceMeters(
                    userLocation,
                    merchant,
                  );

                return {
                  ...merchant,
                  userDistanceMeters,
                };
              },
            )
          : filtered;

      return withDistance.sort(
        (
          a,
          b,
        ) => {
          if (
            userLocation &&
            a.userDistanceMeters !==
              undefined &&
            b.userDistanceMeters !==
              undefined &&
            a.userDistanceMeters !==
              b.userDistanceMeters
          ) {
            return (
              a.userDistanceMeters -
              b.userDistanceMeters
            );
          }

          return (
            a.name.localeCompare(
              b.name,
              "id",
            ) ||
            a.longitude -
              b.longitude ||
            a.latitude -
              b.latitude
          );
        },
      );
    }, [
      brand,
      baseMerchants,
      openOnly,
      userLocation,
    ]);

  const selectedMerchant =
    merchants.find(
      (merchant) =>
        merchant.id ===
        selectedId,
    ) ?? null;

  const regionResultGroups = useMemo(
    () => selectedRegionIds.length > 0
      ? groupMerchantsByRegion(merchants, selectedRegionIds, searchRegions)
      : [],
    [merchants, searchRegions, selectedRegionIds],
  );

  const { poster: profilePoster } = useProfilePoster({
    merchantId: selectedMerchant?.id ?? null,
  });

  const originSearchResults =
    useMemo(
      () =>
        findRouteSearchResults(
          merchants,
          originSearch,
        ),
      [
        merchants,
        originSearch,
      ],
    );

  const destinationSearchResults =
    useMemo(
      () =>
        findRouteSearchResults(
          merchants,
          destinationSearch,
        ),
      [
        merchants,
        destinationSearch,
      ],
    );

  const routeDestination =
    merchants.find(
      (merchant) =>
        merchant.id ===
        routeDestinationId,
    ) ?? null;

  const routeOrigin =
    routeOriginValue === ROUTE_ORIGIN_MANUAL && manualRouteStart
      ? {
          label: "Titik pilihan di peta",
          coordinate: manualRouteStart,
        }
      : routeOriginValue ===
        ROUTE_ORIGIN_USER &&
      userLocation
        ? {
            label:
              "Lokasi saya",
            coordinate: {
              latitude:
                userLocation.latitude,
              longitude:
                userLocation.longitude,
            },
          }
      : explicitRouteOrigin && routeOriginValue.startsWith("MERCHANT:")
        ? { label: explicitRouteOrigin.label, coordinate: explicitRouteOrigin.coordinate }
        : null;

  const routeDurationMinutes =
    route?.duration_seconds !== null && route?.duration_seconds !== undefined
      ? Math.max(
          1,
          Math.ceil(
            route.duration_seconds /
              60,
          ),
        )
      : null;

  const routeOriginPoint = routeOrigin
    ? {
        label: routeOrigin.label,
        latitude: routeOrigin.coordinate.latitude,
        longitude: routeOrigin.coordinate.longitude,
      }
    : null;

  const routeDestinationPoint =
    routeDestination &&
    (
      routeDestinationId ||
      selectedMerchant ||
      route
    )
      ? {
          label:
            routeDestination.name,
          latitude:
            routeDestination.latitude,
          longitude:
            routeDestination.longitude,
        }
      : null;

  const handleSelect =
    useCallback(
      (
        merchant: Merchant,
      ) => {
        setSelectedId(
          merchant.id,
        );
        setRouteDestinationId(
          merchant.id,
        );
        setDestinationSearch(
          merchant.name,
        );
        if (routingState === "IDLE") {
          clearRoute();
        } else if (routeOrigin) {
          void requestRoute(routeOrigin.coordinate, {
            latitude: merchant.latitude,
            longitude: merchant.longitude,
          }, merchant.id);
        }
      },
      [clearRoute, requestRoute, routeOrigin, routingState],
    );

  const clearRouteDestination = useCallback(() => {
    setRouteDestinationId(null);
    clearRoute();
  }, [clearRoute]);

  const handleClearSelection =
    useCallback(() => {
      setSelectedId(
        null,
      );
      setSelectedPropertyId(null);
      setSelectedPropertyDetail(null);
      setSelectedAccessibilityEvidenceId(null);
      setSelectedAccessibilityEvidenceDetail(null);
    }, []);

  const executeCanonicalSearch =
    useCallback(async ({
      bbox,
      queryText,
      regionIds,
      activate,
      focus,
    }: {
      bbox: MapViewportBounds;
      queryText: string;
      regionIds: string[];
      activate: boolean;
      focus: boolean;
    }) => {
      canonicalRequestRef.current?.abort();
      serviceAreaRequestRef.current?.abort();
      const controller = new AbortController();
      canonicalRequestRef.current = controller;

      setMapidLoading(
        true,
      );
      setMapidError(
        null,
      );

      try {
        const searchableBbox = ensureSearchableBounds(bbox);
        const scope = regionIds.length > 1
          ? "MULTI_REGION" as const
          : regionIds.length === 1
            ? "REGION" as const
            : "CURRENT_VIEWPORT" as const;
        const layer: CanonicalMerchantLayer =
          await mapidLayerService.getCanonicalMerchants(
            searchableBbox,
            {
              limit: 100,
              signal: controller.signal,
              query: queryText,
              scope,
              regionIds,
              maxBudget: Number(maxBudget) >= 1_000 ? Number(maxBudget) : undefined,
              openNow: openOnly || undefined,
              maxWalkingMinutes: maxWalkingMinutes ?? undefined,
              origin: routeOrigin
                ? {
                    longitude: routeOrigin.coordinate.longitude,
                    latitude: routeOrigin.coordinate.latitude,
                    source: routeOriginValue === ROUTE_ORIGIN_USER
                      ? "USER_LOCATION"
                      : explicitRouteOrigin
                        ? "EXPLICIT_ORIGIN"
                        : "SELECTED_POINT",
                  }
                : undefined,
            },
          );

        setMapidMerchants(
          layer.merchants,
        );
        setCanonicalViewportLoaded(true);
        setMapidLayerName(
          layer.layer_name,
        );
        setSearchIntent(layer.intent);
        setSearchRegions(layer.available_regions);
        setSelectedRegionIds(layer.intent.scope.region_ids);
        setSearchTotal(layer.total_available);
        const walkingThreshold = layer.intent.constraints.walking?.max_minutes;
        if (walkingThreshold && layer.intent.origin) {
          const serviceAreaController = new AbortController();
          serviceAreaRequestRef.current = serviceAreaController;
          setServiceAreaLoading(true);
          try {
            const area = await commuterService.serviceArea(
              {
                longitude: layer.intent.origin.longitude,
                latitude: layer.intent.origin.latitude,
              },
              walkingThreshold,
              serviceAreaController.signal,
            );
            if (!serviceAreaController.signal.aborted) setServiceArea(area);
          } catch {
            if (!serviceAreaController.signal.aborted) setServiceArea(null);
          } finally {
            if (serviceAreaRequestRef.current === serviceAreaController) {
              serviceAreaRequestRef.current = null;
              setServiceAreaLoading(false);
            }
          }
        } else {
          setServiceArea(null);
          setServiceAreaLoading(false);
        }
        activeSearchRef.current = activate;
        setSearchActive(activate);
        setMapMovedSinceSearch(false);
        if (focus && layer.intent.scope.type !== "CURRENT_VIEWPORT") {
          suppressNextViewportRef.current = true;
          setSearchFocusBounds(layer.intent.scope.bounds);
          setSearchFocusKey((key) => key + 1);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setMapidError(
          error instanceof Error
            ? error.message
            : "Merchant pada area peta belum bisa dimuat.",
        );
      } finally {
        if (canonicalRequestRef.current === controller) {
          canonicalRequestRef.current = null;
          setMapidLoading(false);
        }
      }
    }, [
      maxBudget,
      maxWalkingMinutes,
      openOnly,
      routeOrigin?.coordinate.latitude,
      routeOrigin?.coordinate.longitude,
      explicitRouteOrigin,
      routeOriginValue,
    ]);

  const executePropertySearch = useCallback(async ({
    bbox,
    queryText,
    regionId,
    propertyCategoryValue,
    transactionType,
    focus,
  }: {
    bbox: MapViewportBounds;
    queryText: string;
    regionId: string;
    propertyCategoryValue: string;
    transactionType: "" | "DIJUAL" | "DISEWA";
    focus: boolean;
  }) => {
    propertyRequestRef.current?.abort();
    propertyDetailRequestRef.current?.abort();
    const controller = new AbortController();
    propertyRequestRef.current = controller;
    setPropertyLoading(true);
    setPropertyError(null);
    setSelectedPropertyDetail(null);
    try {
      const inferredRegionId = regionId || inferPropertyRegionId(queryText);
      const inferredTransaction = transactionType || inferPropertyTransactionType(queryText);
      const keyword = normalizePropertySearchKeyword(queryText);
      const result = await businessSpaceService.listCandidates({
        bbox: inferredRegionId ? undefined : ensureSearchableBounds(bbox),
        category: propertyBusinessCategory,
        days: 30,
        limit: 24,
        property_category: propertyCategoryValue || undefined,
        q: keyword || undefined,
        region_id: inferredRegionId || undefined,
        transaction_type: inferredTransaction || undefined,
      }, controller.signal);
      if (controller.signal.aborted) return;
      setPropertyCandidates(result.candidates);
      setSelectedPropertyId((current) =>
        current && result.candidates.some((candidate) => candidate.id === current)
          ? current
          : result.candidates[0]?.id ?? null,
      );
      if (focus && inferredRegionId) {
        const region = PROPERTY_REGION_OPTIONS.find((item) => item.id === inferredRegionId);
        if (region) setPropertyRegionId(region.id);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setPropertyCandidates([]);
      setSelectedPropertyId(null);
      setPropertyError(error instanceof Error ? error.message : "Properti Go belum bisa dimuat.");
    } finally {
      if (propertyRequestRef.current === controller) {
        propertyRequestRef.current = null;
        setPropertyLoading(false);
      }
    }
  }, [propertyBusinessCategory]);

  const loadSelectedPropertyDetail = useCallback(async (candidate: BusinessSpaceCandidate) => {
    propertyDetailRequestRef.current?.abort();
    const controller = new AbortController();
    propertyDetailRequestRef.current = controller;
    setSelectedPropertyId(candidate.id);
    setPropertyDetailLoading(true);
    try {
      const detail = await businessSpaceService.detail(
        candidate.id,
        { category: propertyBusinessCategory, days: 30 },
        controller.signal,
      );
      if (!controller.signal.aborted) setSelectedPropertyDetail(detail);
    } catch {
      if (!controller.signal.aborted) setSelectedPropertyDetail(null);
    } finally {
      if (propertyDetailRequestRef.current === controller) {
        propertyDetailRequestRef.current = null;
        setPropertyDetailLoading(false);
      }
    }
  }, [propertyBusinessCategory]);

  const executeAccessibilitySearch = useCallback(async (bbox: MapViewportBounds) => {
    accessibilityRequestRef.current?.abort();
    const controller = new AbortController();
    accessibilityRequestRef.current = controller;
    setAccessibilityLoading(true);
    setAccessibilityError(null);
    setSelectedAccessibilityEvidenceDetail(null);
    try {
      const query = {
        bbox: ensureSearchableBounds(bbox),
        category: accessibilityCategory || undefined,
        days: accessibilityDays || undefined,
        limit: 100,
        source_type: accessibilitySource || undefined,
        validation_status: accessibilityStatus || undefined,
      };
      const [result, need] = await Promise.all([
        accessibilityEvidenceService.list(query, controller.signal),
        accessibilityEvidenceService.need(query, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setAccessibilityEvidence(result.evidence);
      setAccessibilityNeed(need);
      setSelectedAccessibilityEvidenceId((current) =>
        current && result.evidence.some((item) => item.id === current)
          ? current
          : result.evidence[0]?.id ?? null,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setAccessibilityEvidence([]);
      setAccessibilityNeed(null);
      setSelectedAccessibilityEvidenceId(null);
      setAccessibilityError(
        error instanceof Error
          ? error.message
          : "Observasi aksesibilitas belum bisa dimuat.",
      );
    } finally {
      if (accessibilityRequestRef.current === controller) {
        accessibilityRequestRef.current = null;
        setAccessibilityLoading(false);
      }
    }
  }, [
    accessibilityCategory,
    accessibilityDays,
    accessibilitySource,
    accessibilityStatus,
  ]);

  const loadSelectedAccessibilityEvidenceDetail = useCallback(async (evidence: AccessibilityEvidence) => {
    accessibilityDetailRequestRef.current?.abort();
    const controller = new AbortController();
    accessibilityDetailRequestRef.current = controller;
    setSelectedAccessibilityEvidenceId(evidence.id);
    setAccessibilityDetailLoading(true);
    try {
      const detail = await accessibilityEvidenceService.detail(evidence.id, controller.signal);
      if (!controller.signal.aborted) setSelectedAccessibilityEvidenceDetail(detail);
    } catch {
      if (!controller.signal.aborted) setSelectedAccessibilityEvidenceDetail(null);
    } finally {
      if (accessibilityDetailRequestRef.current === controller) {
        accessibilityDetailRequestRef.current = null;
        setAccessibilityDetailLoading(false);
      }
    }
  }, []);

  const handleViewportChange = useCallback((bbox: MapViewportBounds) => {
    currentViewportRef.current = bbox;
    setMapViewport(bbox);
    if (primaryMode === "business-space") {
      void executePropertySearch({
        bbox,
        queryText: propertyQuery,
        regionId: propertyRegionId,
        propertyCategoryValue: propertyCategory,
        transactionType: propertyTransactionType,
        focus: false,
      });
      return;
    }
    if (primaryMode === "accessibility") {
      void executeAccessibilitySearch(bbox);
      return;
    }
    if (suppressNextViewportRef.current) {
      suppressNextViewportRef.current = false;
      return;
    }
    if (activeSearchRef.current) {
      setMapMovedSinceSearch(true);
      return;
    }
    void executeCanonicalSearch({
      bbox,
      queryText: "",
      regionIds: [],
      activate: false,
      focus: false,
    });
  }, [
    executeCanonicalSearch,
    executeAccessibilitySearch,
    executePropertySearch,
    primaryMode,
    propertyCategory,
    propertyQuery,
    propertyRegionId,
    propertyTransactionType,
  ]);

  const handleContextualLayerChange = useCallback((
    layer: ContextualLayerKey,
    visible: boolean,
  ) => {
    setContextualLayerVisibilityState((current) =>
      setContextualLayerVisibility(current, layer, visible)
    );
  }, []);

  const submitGlobalSearch = useCallback(() => {
    clearRoute();
    setRouteDestinationId(null);
    setSelectedId(null);
    setDestinationSearch("");
    setDatasetId("all-areas");
    setViewMode("dataset");
    void executeCanonicalSearch({
      bbox: currentViewportRef.current ?? datasetBounds,
      queryText: query,
      regionIds: selectedRegionIds,
      activate: Boolean(
        query.trim() || selectedRegionIds.length || maxBudget || openOnly || maxWalkingMinutes,
      ),
      focus: true,
    });
  }, [clearRoute, datasetBounds, executeCanonicalSearch, maxBudget, maxWalkingMinutes, openOnly, query, selectedRegionIds]);

  const toggleSearchRegion = useCallback((regionId: string) => {
    const next = selectedRegionIds.includes(regionId)
      ? selectedRegionIds.filter((id) => id !== regionId)
      : [...selectedRegionIds, regionId];
    setSelectedRegionIds(next);
    setDatasetId("all-areas");
    setViewMode("dataset");
    void executeCanonicalSearch({
      bbox: currentViewportRef.current ?? datasetBounds,
      queryText: query,
      regionIds: next,
      activate: Boolean(query.trim() || next.length || maxBudget || openOnly || maxWalkingMinutes),
      focus: true,
    });
  }, [datasetBounds, executeCanonicalSearch, maxBudget, maxWalkingMinutes, openOnly, query, selectedRegionIds]);

  const clearGlobalSearch = useCallback(() => {
    setQuery("");
    setSelectedRegionIds([]);
    setSearchIntent(null);
    setSearchTotal(null);
    setMapMovedSinceSearch(false);
    activeSearchRef.current = false;
    setSearchActive(false);
    setMaxBudget("");
    setMaxWalkingMinutes(null);
    setOpenOnly(false);
    setServiceArea(null);
    const bbox = currentViewportRef.current;
    if (bbox) void executeCanonicalSearch({
      bbox,
      queryText: "",
      regionIds: [],
      activate: false,
      focus: false,
    });
  }, [executeCanonicalSearch]);

  const searchCurrentArea = useCallback(() => {
    const bbox = currentViewportRef.current;
    if (!bbox) return;
    const keyword = searchIntent?.keyword ?? query;
    setQuery(keyword);
    setSelectedRegionIds([]);
    void executeCanonicalSearch({
      bbox,
      queryText: keyword,
      regionIds: [],
      activate: Boolean(keyword.trim() || maxBudget || openOnly || maxWalkingMinutes),
      focus: false,
    });
  }, [executeCanonicalSearch, maxBudget, maxWalkingMinutes, openOnly, query, searchIntent]);

  const activateMerchantMode = useCallback(() => {
    setPrimaryMode("merchant");
    setSelectedPropertyId(null);
    setSelectedPropertyDetail(null);
    setPropertyCandidates([]);
    setSelectedAccessibilityEvidenceId(null);
    setSelectedAccessibilityEvidenceDetail(null);
    setAccessibilityEvidence([]);
    setAccessibilityNeed(null);
    const bbox = currentViewportRef.current;
    if (bbox) {
      void executeCanonicalSearch({
        bbox,
        queryText: query,
        regionIds: selectedRegionIds,
        activate: Boolean(query.trim() || selectedRegionIds.length || maxBudget || openOnly || maxWalkingMinutes),
        focus: false,
      });
    }
  }, [executeCanonicalSearch, maxBudget, maxWalkingMinutes, openOnly, query, selectedRegionIds]);

  const activateBusinessSpaceMode = useCallback(() => {
    setPrimaryMode("business-space");
    setViewMode("dataset");
    setSelectedId(null);
    setSelectedAccessibilityEvidenceId(null);
    setSelectedAccessibilityEvidenceDetail(null);
    setAccessibilityEvidence([]);
    setAccessibilityNeed(null);
    setRouteDestinationId(null);
    clearRoute();
    void executePropertySearch({
      bbox: currentViewportRef.current ?? datasetBounds,
      queryText: propertyQuery,
      regionId: propertyRegionId,
      propertyCategoryValue: propertyCategory,
      transactionType: propertyTransactionType,
      focus: true,
    });
  }, [
    clearRoute,
    datasetBounds,
    executePropertySearch,
    propertyCategory,
    propertyQuery,
    propertyRegionId,
    propertyTransactionType,
  ]);

  const activateAccessibilityMode = useCallback(() => {
    setPrimaryMode("accessibility");
    setViewMode("dataset");
    setSelectedId(null);
    setSelectedPropertyId(null);
    setSelectedPropertyDetail(null);
    setPropertyCandidates([]);
    setRouteDestinationId(null);
    clearRoute();
    void executeAccessibilitySearch(currentViewportRef.current ?? datasetBounds);
  }, [clearRoute, datasetBounds, executeAccessibilitySearch]);

  const submitAccessibilitySearch = useCallback(() => {
    setPrimaryMode("accessibility");
    void executeAccessibilitySearch(currentViewportRef.current ?? datasetBounds);
  }, [datasetBounds, executeAccessibilitySearch]);

  const submitPropertySearch = useCallback(() => {
    setPrimaryMode("business-space");
    void executePropertySearch({
      bbox: currentViewportRef.current ?? datasetBounds,
      queryText: propertyQuery,
      regionId: propertyRegionId,
      propertyCategoryValue: propertyCategory,
      transactionType: propertyTransactionType,
      focus: true,
    });
  }, [
    datasetBounds,
    executePropertySearch,
    propertyCategory,
    propertyQuery,
    propertyRegionId,
    propertyTransactionType,
  ]);

  useEffect(() => () => {
    canonicalRequestRef.current?.abort();
    serviceAreaRequestRef.current?.abort();
    propertyRequestRef.current?.abort();
    propertyDetailRequestRef.current?.abort();
    accessibilityRequestRef.current?.abort();
    accessibilityDetailRequestRef.current?.abort();
  }, []);

  useEffect(() => {
    let active = true;

    void adminMapImportService
      .list()
      .then((result) => {
        if (!active) {
          return;
        }

        const merchants =
          result.layers.flatMap(
            (layer) =>
              layer.merchants,
          );

        const boundaries =
          result.layers.flatMap(
            (layer) =>
              layer.boundaries
                ?.features ?? [],
          );

        setAdminImportedLayers(
          result.layers,
        );

        setAdminImportedLayer(
          result.total_features > 0
            ? {
                layer_id:
                  "persisted-admin-imports",
                layer_name:
                  `${result.total_layers} layer import database`,
                source_type:
                  "JSON_PAYLOAD",
                total_features:
                  result.total_features,
                merchants,
                persisted:
                  true,
                limitation:
                  "Layer tersimpan di database sebagai SURVEYED.",
                boundaries: {
                  type:
                    "FeatureCollection",
                  features:
                    boundaries,
                },
              }
            : null,
        );
      })
      .catch(() => {
        if (active) {
          setAdminImportedLayers(
            [],
          );
          setAdminImportedLayer(
            null,
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDatasetChange =
    useCallback(
      (
        nextDatasetId: DatasetId,
      ) => {
        setDatasetId(
          nextDatasetId,
        );
        setBrand(
          "Semua",
        );
        setQuery(
          "",
        );
        setSelectedId(
          null,
        );
        setRouteDestinationId(
          null,
        );
        setOriginSearch(
          "",
        );
        setDestinationSearch(
          "",
        );
        setPendingRouteChoice(
          null,
        );
        setRouteOriginValue(
          ROUTE_ORIGIN_NONE,
        );
        setExplicitRouteOrigin(null);
        clearRoute();

      },
      [
        clearRoute,
      ],
    );

  const handleBuildRoute =
    useCallback(() => {
      if (!routeDestination || !routeOrigin) {
        return;
      }

      requestRoute(
        routeOrigin.coordinate,
        {
          latitude:
            routeDestination.latitude,
          longitude:
            routeDestination.longitude,
        },
        routeDestination.id,
      );
    }, [
      requestRoute,
      routeDestination,
      routeOrigin?.coordinate.latitude,
      routeOrigin?.coordinate.longitude,
    ]);

  const handleSmartAlternative = useCallback(() => {
    if (merchants.length < 2 || !routeOrigin) return;
    const currentIndex = merchants.findIndex((merchant) => merchant.id === routeDestination?.id);
    const alternative = merchants[(currentIndex + 1 + merchants.length) % merchants.length];
    if (!alternative || alternative.id === routeDestination?.id) return;
    setSelectedId(alternative.id);
    setRouteDestinationId(alternative.id);
    setDestinationSearch(alternative.name);
    void requestRoute(routeOrigin.coordinate, {
      latitude: alternative.latitude,
      longitude: alternative.longitude,
    }, alternative.id);
  }, [merchants, requestRoute, routeDestination?.id, routeOrigin?.coordinate.latitude, routeOrigin?.coordinate.longitude]);

  const handleRouteChoice =
    useCallback(
      (
        target: RouteSearchTarget,
        merchant: Merchant,
      ) => {
        setPendingRouteChoice({
          target,
          merchant,
        });
      },
      [],
    );

  const handleConfirmRouteChoice =
    useCallback(() => {
      if (!pendingRouteChoice) {
        return;
      }

      const { target, merchant } =
        pendingRouteChoice;

      if (target === "origin") {
        setRouteOriginValue(
          `MERCHANT:${merchant.id}`,
        );
        setExplicitRouteOrigin({
          id: merchant.id,
          label: merchant.name,
          coordinate: { latitude: merchant.latitude, longitude: merchant.longitude },
        });
        setOriginSearch(
          merchant.name,
        );
      } else {
        setRouteDestinationId(
          merchant.id,
        );
        setSelectedId(
          merchant.id,
        );
        setDestinationSearch(
          merchant.name,
        );
        if (routingState !== "IDLE" && routeOrigin) {
          void requestRoute(routeOrigin.coordinate, {
            latitude: merchant.latitude,
            longitude: merchant.longitude,
          }, merchant.id);
        }
      }

      if (target === "origin" || routingState === "IDLE") clearRoute();
      setPendingRouteChoice(
        null,
      );
    }, [
      clearRoute,
      pendingRouteChoice,
      requestRoute,
      routeOrigin?.coordinate.latitude,
      routeOrigin?.coordinate.longitude,
      routingState,
    ]);

  const handleLocateUser =
    useCallback(() => {
      setLocationError(
        null,
      );

      if (
        !("geolocation" in navigator)
      ) {
        setLocationError(
          "Perangkat atau browser belum mendukung GPS/location.",
        );
        return;
      }

      setLocating(
        true,
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            accuracyMeters:
              Math.round(
                position.coords.accuracy,
              ),
            capturedAt:
              new Date().toISOString(),
          });

          setRouteOriginValue(
            ROUTE_ORIGIN_USER,
          );
          setExplicitRouteOrigin(null);
          setOriginSearch(
            "",
          );
          clearRoute();

          setLocating(
            false,
          );
        },
        (error) => {
          const message =
            error.code ===
            error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan permission location di browser untuk memakai GPS."
              : error.code ===
                  error.POSITION_UNAVAILABLE
                ? "Lokasi perangkat belum tersedia. Coba nyalakan GPS/Wi-Fi location lalu ulangi."
                : "Pengambilan lokasi terlalu lama. Coba ulangi dari perangkat.";

          setLocationError(
            message,
          );
          setLocating(
            false,
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        },
      );
    }, [clearRoute]);

  const handleUseUserLocationAsOrigin =
    useCallback(() => {
      if (!userLocation) {
        handleLocateUser();
        return;
      }

      setRouteOriginValue(
        ROUTE_ORIGIN_USER,
      );
      setExplicitRouteOrigin(null);
      setOriginSearch(
        "",
      );
      clearRoute();
    }, [
      clearRoute,
      handleLocateUser,
      userLocation,
    ]);

  const handleUseDatasetCenterAsOrigin =
    useCallback(() => {
      setRouteOriginValue(
        ROUTE_ORIGIN_NONE,
      );
      setExplicitRouteOrigin(null);
      setOriginSearch(
        "",
      );
      clearRoute();
      setMapPickMode("NONE");
    }, [clearRoute]);

  const handleUseManualOrigin = useCallback(() => {
    setRouteOriginValue(ROUTE_ORIGIN_MANUAL);
    setExplicitRouteOrigin(null);
    setOriginSearch("");
    clearRoute();
    setMapPickMode("ROUTE_START");
  }, [clearRoute]);

  const handleClearManualOrigin = useCallback(() => {
    setManualRouteStart(null);
    setMapPickMode("NONE");
    handleUseDatasetCenterAsOrigin();
  }, [handleUseDatasetCenterAsOrigin]);

  const handleMapPick = useCallback((coordinate: { latitude: number; longitude: number }) => {
    setManualRouteStart(coordinate);
    setMapPickMode("NONE");
  }, []);

  useEffect(() => {
    const requestId =
      window.setTimeout(
        handleLocateUser,
        0,
      );

    return () => {
      window.clearTimeout(
        requestId,
      );
    };
  }, [handleLocateUser]);

  const handleLogout =
    useCallback(async () => {
      if (loggingOut) return;

      setLoggingOut(
        true,
      );

      try {
        try {
          await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
            {
              method:
                "POST",
            },
          );
        } catch {
          // Browser logout must still clear its local session if the API is down.
        }

        await clearAuthSession();
        router.replace(
          "/login",
        );
        router.refresh();
      } catch {
        setLoggingOut(
          false,
        );
      }
    }, [
      loggingOut,
      router,
    ]);

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <GetraLogo className="workspace-brand-logo" />
        </div>

        <StakeholderModeSwitcher />

        <div className="topbar-actions">
          {isAdmin ? (
            <button
              className="admin-nav-button"
              type="button"
              onClick={() =>
                router.push(
                  "/admin/import",
                )
              }
            >
              <Database size={15} />
              Import data
            </button>
          ) : null}

          {isUmkm ? (
            <button
              className="umkm-ads-nav-button"
              type="button"
              onClick={() =>
                router.push(
                  "/umkm/advertising",
                )
              }
              title="Buka Dasbor Iklan & Promosi UMKM"
            >
              <Megaphone size={15} />
              Advertising UMKM
            </button>
          ) : null}

          <button
            className="business-space-nav-button"
            type="button"
            onClick={() =>
              router.push(
                "/business-space",
              )
            }
          >
            <Building2 size={15} />
            Business Space
          </button>

          <div className="pilot-badge">
            <ShieldCheck size={15} />
            {datasetId ===
            "all-areas"
              ? "All data"
              : isAdminImportDataset(
                  datasetId,
                )
                ? "Import"
                : datasetId ===
                  "mapid-food-jakarta-pusat"
                ? "MAPID 2025"
                : "GeoJSON Q2 2026"}
          </div>

          <AccountMenu
            context={authContext}
          />

          <CommunityNotificationsMenu />

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={15} />
            {loggingOut
              ? "Keluar..."
              : "Keluar"}
          </button>
        </div>
      </header>

      <StakeholderContextShell>
        <section className="workspace-grid">
          <aside className="left-panel panel" tabIndex={0} aria-label="Kontrol pencarian dan rute">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {datasetId ===
                "all-areas"
                  ? "GETRA search"
                  : isAdminImportDataset(
                      datasetId,
                    )
                    ? "Import search"
                    : datasetId ===
                      "mapid-food-jakarta-pusat"
                    ? "MAPID search"
                    : "GeoJSON search"}
              </span>
              <h1>
                {datasetTitle}
              </h1>
            </div>
            <Search size={20} />
          </div>

          <div className="origin-box">
            <MapPinned size={17} />
            <div>
              <span>
                Lokasi pengguna
              </span>
              <strong>
                {userLocation
                  ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                  : datasetOrigin.name}
              </strong>
              {userLocation ? (
                <small>
                  Akurasi GPS sekitar {userLocation.accuracyMeters} m
                </small>
              ) : null}
            </div>
          </div>

          <button
            className="locate-button"
            type="button"
            onClick={handleLocateUser}
            disabled={locating}
          >
            <LocateFixed size={16} />
            {locating
              ? "Mengambil lokasi..."
              : userLocation
                ? "Perbarui lokasi saya"
                : "Gunakan lokasi saya"}
          </button>

          {locationError ? (
            <p className="location-error">
              {locationError}
            </p>
          ) : null}

          <section className="dataset-switcher">
            <div>
              <span className="eyebrow">
                Data map
              </span>
              <strong>
                Filter cakupan data
              </strong>
            </div>
            <div className="dataset-switcher__buttons">
              <button
                type="button"
                className={
                  datasetId ===
                  "all-areas"
                    ? "dataset-button dataset-button--active"
                    : "dataset-button"
                }
                onClick={() =>
                  handleDatasetChange(
                    "all-areas",
                  )
                }
              >
                Semua data
              </button>
              {adminImportedLayers.map(
                (layer) => {
                  const importDatasetId =
                    toAdminImportDatasetId(
                      layer.layer_id,
                    );

                  return (
                    <button
                      key={layer.layer_id}
                      type="button"
                      className={
                        datasetId ===
                        importDatasetId
                          ? "dataset-button dataset-button--active"
                          : "dataset-button"
                      }
                      onClick={() =>
                        handleDatasetChange(
                          importDatasetId,
                        )
                      }
                      title={`${layer.layer_name} (${layer.total_features} titik)`}
                    >
                      {layer.layer_name}
                    </button>
                  );
                },
              )}
              <button
                type="button"
                className={
                  datasetId ===
                  "coffee-jakarta-barat"
                    ? "dataset-button dataset-button--active"
                    : "dataset-button"
                }
                onClick={() =>
                  handleDatasetChange(
                    "coffee-jakarta-barat",
                  )
                }
              >
                Jakarta Barat
              </button>
              <button
                type="button"
                className={
                  datasetId ===
                  "mapid-food-jakarta-pusat"
                    ? "dataset-button dataset-button--active"
                    : "dataset-button"
                }
                onClick={() =>
                  handleDatasetChange(
                    "mapid-food-jakarta-pusat",
                  )
                }
              >
                Jakarta Pusat
              </button>
            </div>
            <small>
              {datasetSourceName}
            </small>
            {mapidLoading &&
            (datasetId ===
              "all-areas" ||
              datasetId ===
                "mapid-food-jakarta-pusat") ? (
              <p className="dataset-message">
                Mengambil layer MAPID...
              </p>
            ) : null}
            {mapidError &&
            (datasetId ===
              "all-areas" ||
              datasetId ===
                "mapid-food-jakarta-pusat") ? (
              <p className="dataset-message dataset-message--error">
                {mapidError}
              </p>
            ) : null}
          </section>

          <section className="route-planner">
            <div className="route-planner__header">
              <div>
                <span className="eyebrow">
                  Rute commuter
                </span>
                <strong>
                  Mulai dari mana?
                </strong>
              </div>
              <Route size={18} />
            </div>

            <div className="route-field">
              <span>
                Titik mulai
              </span>
              <div className="route-quick-actions">
                <button
                  className={
                    routeOriginValue ===
                    ROUTE_ORIGIN_USER
                      ? "route-chip-button route-chip-button--active"
                      : "route-chip-button"
                  }
                  type="button"
                  onClick={handleUseUserLocationAsOrigin}
                >
                  {userLocation
                    ? "Lokasi saya"
                    : locating
                      ? "Mengambil GPS..."
                      : "Aktifkan GPS"}
                </button>
                <button
                  className={
                    routeOriginValue ===
                    ROUTE_ORIGIN_MANUAL
                      ? "route-chip-button route-chip-button--active"
                      : "route-chip-button"
                  }
                  type="button"
                  onClick={handleUseManualOrigin}
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                >
                  <Target size={14} /> Pilih di peta
                </button>
              </div>

              {routeOriginValue === ROUTE_ORIGIN_MANUAL && manualRouteStart ? (
                <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                  <span style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>TITIK MULAI</span>
                  <strong style={{ display: "block", fontSize: "0.9rem", color: "#eef8fa", marginBottom: "0.25rem" }}>Titik pilihan di peta</strong>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1" }}>
                    {manualRouteStart.latitude.toFixed(6)}, {manualRouteStart.longitude.toFixed(6)}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <button type="button" onClick={() => setMapPickMode("ROUTE_START")} style={{ fontSize: "0.75rem", backgroundColor: "#0284c7", color: "white", padding: "0.3rem 0.6rem", borderRadius: "4px", border: "none", cursor: "pointer" }}>Pilih ulang</button>
                    <button type="button" onClick={handleClearManualOrigin} style={{ fontSize: "0.75rem", backgroundColor: "#b91c1c", color: "white", padding: "0.3rem 0.6rem", borderRadius: "4px", border: "none", cursor: "pointer" }}>Batal / Hapus</button>
                  </div>
                </div>
              ) : null}
              <div className="route-search-box">
                <Search size={15} />
                <input
                  aria-label="Cari titik mulai"
                  placeholder="Cari titik mulai dari data..."
                  type="search"
                  value={originSearch}
                  onChange={(event) =>
                    setOriginSearch(
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="route-search-results">
                {originSearchResults.length >
                0 ? (
                  originSearchResults.map(
                    (merchant) => (
                      <button
                        className={
                          routeOriginValue ===
                          `MERCHANT:${merchant.id}`
                            ? "route-search-result route-search-result--active"
                            : "route-search-result"
                        }
                        key={`origin-search-${merchant.id}`}
                        type="button"
                        onClick={() =>
                          handleRouteChoice(
                            "origin",
                            merchant,
                          )
                        }
                      >
                        <strong>
                          {merchant.name}
                        </strong>
                        <span>
                          {merchant.brand} ·{" "}
                          {merchant.district ??
                            merchant.city ??
                            "Lokasi tersedia"}
                        </span>
                      </button>
                    ),
                  )
                ) : originSearch.trim() && explicitRouteOrigin?.label !== originSearch.trim() ? (
                  <p className="route-search-empty">
                    Titik mulai tidak ditemukan.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="route-field">
              <span>
                Tujuan tersedia
              </span>
              <div className="route-search-box route-search-box--destination">
                <Search size={15} />
                <input
                  aria-label="Cari tujuan"
                  placeholder="Cari nama, brand, alamat, kecamatan..."
                  type="search"
                  value={destinationSearch}
                  onChange={(event) =>
                    setDestinationSearch(
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="route-search-results">
                {destinationSearchResults.length >
                0 ? (
                  destinationSearchResults.map(
                    (merchant) => (
                      <button
                        className={
                          routeDestination?.id ===
                          merchant.id
                            ? "route-search-result route-search-result--active"
                            : "route-search-result"
                        }
                        key={`destination-search-${merchant.id}`}
                        type="button"
                        onClick={() =>
                          handleRouteChoice(
                            "destination",
                            merchant,
                          )
                        }
                      >
                        <strong>
                          {merchant.name}
                        </strong>
                        <span>
                          {getMerchantAreaLine(
                            merchant,
                          ) ||
                            `${merchant.latitude.toFixed(5)}, ${merchant.longitude.toFixed(5)}`}
                        </span>
                      </button>
                    ),
                  )
                ) : destinationSearch.trim() ? (
                  <p className="route-search-empty">
                    Tujuan tidak ditemukan.
                  </p>
                ) : null}
              </div>
            </div>

            {routeDestination ? (
              <div style={{ marginTop: "1.5rem", marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
                <span style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>TUJUAN</span>
                <strong style={{ display: "block", fontSize: "0.9rem", color: "#eef8fa", marginBottom: "0.25rem" }}>
                  <MapPinned size={14} style={{ display: "inline-block", marginRight: "4px", verticalAlign: "middle", color: "#ef4444" }}/>
                  {routeDestination.name}
                </strong>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#cbd5e1", marginLeft: "18px" }}>
                  {routeDestination.district ?? routeDestination.city ?? `${routeDestination.latitude.toFixed(5)}, ${routeDestination.longitude.toFixed(5)}`}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button type="button" onClick={() => {
                    const input = document.querySelector('.route-search-box--destination input') as HTMLInputElement;
                    input?.focus();
                  }} style={{ fontSize: "0.75rem", backgroundColor: "#0284c7", color: "white", padding: "0.3rem 0.6rem", borderRadius: "4px", border: "none", cursor: "pointer" }}>Ganti tujuan</button>
                  <button type="button" onClick={clearRouteDestination} style={{ fontSize: "0.75rem", backgroundColor: "#b91c1c", color: "white", padding: "0.3rem 0.6rem", borderRadius: "4px", border: "none", cursor: "pointer" }}>Batal / Hapus tujuan</button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "1.5rem", marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#0f172a", borderRadius: "8px", border: "1px dashed #334155" }}>
                <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>TUJUAN</span>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>Belum ada tujuan dipilih.</p>
              </div>
            )}

            <div className="route-actions" style={{ marginTop: "1rem" }}>
              <button
                className="route-primary-button"
                type="button"
                disabled={
                  !routeDestination ||
                  routingState ===
                    "LOADING"
                }
                onClick={handleBuildRoute}
              >
                {routingState ===
                "LOADING"
                  ? "Menghitung rute..."
                  : "Hitung Rute"}
              </button>
              <button
                className="route-secondary-button"
                type="button"
                onClick={clearRoute}
                disabled={!route}
              >
                Reset
              </button>
              <button
                className="route-secondary-button"
                type="button"
                onClick={handleSmartAlternative}
                disabled={merchants.length < 2 || routingState === "LOADING"}
              >
                Alternatif berikutnya
              </button>
            </div>

            {route && route.distance_meters !== null ? (
              <div
                className="route-result"
              >
                <strong>
                  {formatDistance(
                    route.distance_meters,
                  )}
                  {" | "}
                  {routeDurationMinutes} menit
                </strong>
                <span>
                  Rute berjalan kaki dihitung dari jaringan pedestrian GETRA.
                </span>
              </div>
            ) : null}

            {routingError ? (
              <p className="route-message">
                {routingError}
              </p>
            ) : null}
          </section>

          {pendingRouteChoice ? (
            <div
              className="route-choice-backdrop"
              role="presentation"
            >
              <div
                aria-modal="true"
                className="route-choice-modal"
                role="dialog"
              >
                <span className="eyebrow">
                  {pendingRouteChoice.target ===
                  "origin"
                    ? "Konfirmasi titik mulai"
                    : "Konfirmasi tujuan"}
                </span>
                <h3>
                  {pendingRouteChoice.target ===
                  "origin"
                    ? "Gunakan lokasi ini sebagai titik mulai?"
                    : "Mau ke tempat ini?"}
                </h3>
                <strong>
                  {
                    pendingRouteChoice
                      .merchant.name
                  }
                </strong>
                <p>
                  {
                    pendingRouteChoice
                      .merchant.brand
                  }{" "}
                  ·{" "}
                  {
                    pendingRouteChoice
                      .merchant.category
                  }
                </p>
                <dl className="route-choice-details">
                  <div>
                    <dt>
                      Area
                    </dt>
                    <dd>
                      {getMerchantAreaLine(
                        pendingRouteChoice.merchant,
                      ) ||
                        "Detail area belum tersedia"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Koordinat
                    </dt>
                    <dd>
                      {pendingRouteChoice.merchant.latitude.toFixed(
                        6,
                      )}
                      ,{" "}
                      {pendingRouteChoice.merchant.longitude.toFixed(
                        6,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Status
                    </dt>
                    <dd>
                      {pendingRouteChoice.merchant.openingStatus === "OPEN" ||
                      (pendingRouteChoice.merchant.openStatusKnown && pendingRouteChoice.merchant.openNow)
                        ? "BUKA"
                        : pendingRouteChoice.merchant.openingStatus === "CLOSED" ||
                            (pendingRouteChoice.merchant.openStatusKnown && !pendingRouteChoice.merchant.openNow)
                          ? "TUTUP"
                          : "Jam buka tidak tersedia"}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Sumber
                    </dt>
                    <dd>
                      {
                        pendingRouteChoice
                          .merchant.source
                      }
                    </dd>
                  </div>
                </dl>
                <div className="route-choice-actions">
                  <button
                    className="route-secondary-button"
                    type="button"
                    onClick={() =>
                      setPendingRouteChoice(
                        null,
                      )
                    }
                  >
                    Batal
                  </button>
                  <button
                    className="route-primary-button"
                    type="button"
                    onClick={handleConfirmRouteChoice}
                  >
                    {pendingRouteChoice.target ===
                    "origin"
                      ? "Pakai sebagai start"
                      : "Ya, jadikan tujuan"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="primary-map-mode" aria-label="Mode peta utama">
            <button
              type="button"
              className={primaryMode === "merchant" ? "primary-map-mode__button primary-map-mode__button--active" : "primary-map-mode__button"}
              aria-pressed={primaryMode === "merchant"}
              onClick={activateMerchantMode}
            >
              Merchant
            </button>
            <button
              type="button"
              className={primaryMode === "business-space" ? "primary-map-mode__button primary-map-mode__button--active" : "primary-map-mode__button"}
              aria-pressed={primaryMode === "business-space"}
              onClick={activateBusinessSpaceMode}
            >
              Business Space
            </button>
            <button
              type="button"
              className={primaryMode === "accessibility" ? "primary-map-mode__button primary-map-mode__button--active" : "primary-map-mode__button"}
              aria-pressed={primaryMode === "accessibility"}
              onClick={activateAccessibilityMode}
            >
              Accessibility
            </button>
          </div>

          {primaryMode === "merchant" ? (
            <GlobalSearchControls
              query={query}
              regions={searchRegions}
              selectedRegionIds={selectedRegionIds}
              intent={searchIntent}
              loading={mapidLoading}
              error={mapidError}
              total={searchTotal}
              mapMoved={mapMovedSinceSearch}
              maxBudget={maxBudget}
              openNow={openOnly}
              maxWalkingMinutes={maxWalkingMinutes}
              onQueryChange={setQuery}
              onSubmit={submitGlobalSearch}
              onClear={clearGlobalSearch}
              onToggleRegion={toggleSearchRegion}
              onSearchThisArea={searchCurrentArea}
              onMaxBudgetChange={setMaxBudget}
              onOpenNowChange={setOpenOnly}
              onMaxWalkingMinutesChange={setMaxWalkingMinutes}
            />
          ) : primaryMode === "business-space" ? (
            <section className="property-search-panel" aria-label="Pencarian Properti Go">
              <label>
                <span>Cari Properti Go</span>
                <input
                  type="search"
                  value={propertyQuery}
                  placeholder="Cari properti atau area..."
                  onChange={(event) => setPropertyQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitPropertySearch();
                  }}
                />
              </label>
              <div className="property-filter-grid">
                <label>
                  <span>Wilayah / Area</span>
                  <select value={propertyRegionId} onChange={(event) => setPropertyRegionId(event.target.value)}>
                    {PROPERTY_REGION_OPTIONS.map((option) => (
                      <option key={option.id || "viewport"} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Kategori usaha</span>
                  <select value={propertyBusinessCategory} onChange={(event) => setPropertyBusinessCategory(event.target.value as BusinessCategorySlug)}>
                    {PROPERTY_BUSINESS_CATEGORIES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Kategori Properti</span>
                  <input
                    value={propertyCategory}
                    placeholder="ruko"
                    onChange={(event) => setPropertyCategory(event.target.value)}
                  />
                </label>
                <label>
                  <span>Jenis</span>
                  <select value={propertyTransactionType} onChange={(event) => setPropertyTransactionType(event.target.value as "" | "DIJUAL" | "DISEWA")}>
                    <option value="">Semua</option>
                    <option value="DIJUAL">Dijual</option>
                    <option value="DISEWA">Disewa</option>
                  </select>
                </label>
              </div>
              <button className="route-primary-button property-search-button" type="button" onClick={submitPropertySearch}>
                <Search size={15} />
                Cari Properti
              </button>
              {propertyLoading ? <p className="route-message" role="status">Memuat Properti Go pada cakupan aktif...</p> : null}
              {propertyError ? <p className="route-message route-message--error" role="alert">{propertyError}</p> : null}
            </section>
          ) : (
            <section className="accessibility-search-panel" aria-label="Filter observasi aksesibilitas">
              <div className="accessibility-panel-heading">
                <ShieldCheck size={17} />
                <div>
                  <strong>Observasi aksesibilitas</strong>
                  <span>Evidence viewport, bukan routing penalty.</span>
                </div>
              </div>
              <div className="property-filter-grid">
                <label>
                  <span>Sumber</span>
                  <select value={accessibilitySource} onChange={(event) => setAccessibilitySource(event.target.value as "" | AccessibilityEvidenceSource)}>
                    {ACCESSIBILITY_SOURCE_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Kategori</span>
                  <select value={accessibilityCategory} onChange={(event) => setAccessibilityCategory(event.target.value as "" | AccessibilityEvidenceCategory)}>
                    {ACCESSIBILITY_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select value={accessibilityStatus} onChange={(event) => setAccessibilityStatus(event.target.value as "" | AccessibilityValidationStatus)}>
                    {ACCESSIBILITY_STATUS_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Periode</span>
                  <select value={accessibilityDays} onChange={(event) => setAccessibilityDays(Number(event.target.value) as 30 | 90 | 0)}>
                    <option value={30}>30 hari</option>
                    <option value={90}>90 hari</option>
                    <option value={0}>Semua waktu</option>
                  </select>
                </label>
              </div>
              <button className="route-primary-button property-search-button" type="button" onClick={submitAccessibilitySearch}>
                <Search size={15} />
                Terapkan filter
              </button>
              {accessibilityLoading ? <p className="route-message" role="status">Memuat observasi aksesibilitas pada viewport aktif...</p> : null}
              {accessibilityError ? <p className="route-message route-message--error" role="alert">{accessibilityError}</p> : null}
              {accessibilityNeed ? (
                <div className="accessibility-summary" data-accessibility-sample-size={accessibilityNeed.sample_size}>
                  <span><strong>{accessibilityNeed.observation_count}</strong> observasi</span>
                  <span><strong>{accessibilityNeed.confirmed_count}</strong> terkonfirmasi</span>
                  <span><strong>{accessibilityNeed.needs_review_count}</strong> perlu verifikasi</span>
                  <span><strong>{accessibilityNeed.recent_count}</strong> recent</span>
                </div>
              ) : null}
              {accessibilityNeed?.low_sample ? (
                <p className="limitation-box">Data observasi masih terbatas.</p>
              ) : null}
            </section>
          )}

          {primaryMode === "merchant" && serviceAreaLoading ? (
            <p className="route-message" role="status">Menghitung jangkauan berjalan...</p>
          ) : primaryMode === "merchant" && serviceArea?.status === "READY" ? (
            <p className="route-message" role="status">
              Jangkauan jaringan {serviceArea.threshold_minutes} menit: {serviceArea.reachable_edge_count ?? 0} segmen terjangkau.
            </p>
          ) : primaryMode === "merchant" && maxWalkingMinutes ? (
            <p className="route-message" role="status">Jaringan pedestrian tidak tersedia dari titik awal ini.</p>
          ) : null}

          {primaryMode === "merchant" && searchActive && searchTotal === 0 ? (
            <section className="commuter-no-results" aria-live="polite">
              <strong>Tidak ada merchant yang memenuhi semua batas.</strong>
              <span>GETRA tidak melonggarkan budget, status buka, atau waktu berjalan secara otomatis.</span>
              <div>
                {maxBudget ? <button type="button" onClick={() => setMaxBudget("")}>Hapus budget</button> : null}
                {openOnly ? <button type="button" onClick={() => setOpenOnly(false)}>Abaikan status buka</button> : null}
                {maxWalkingMinutes ? (
                  <button type="button" onClick={() => {
                    setMaxWalkingMinutes(null);
                    setServiceArea(null);
                  }}>Hapus batas berjalan</button>
                ) : null}
              </div>
            </section>
          ) : null}

          {primaryMode === "merchant" ? (
            <RegionScopeSummary
              selectedRegionIds={selectedRegionIds}
              regions={searchRegions}
              boundaryLoading={boundaryLoading}
              boundaryError={boundaryError}
              onRemove={toggleSearchRegion}
            />
          ) : null}

          {primaryMode === "merchant" ? <div className="filter-grid filter-grid--single">
            <label>
              <span>
                Brand
              </span>
              <select
                value={brand}
                onChange={(event) =>
                  setBrand(
                    event.target
                      .value,
                  )
                }
              >
                {brandOptions.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div> : null}

          <div className="section-divider" />

          {/* View Mode Switcher */}
          {primaryMode === "merchant" ? <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode("fair-discovery")}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                viewMode === "fair-discovery"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ✨ Penelusuran Adil
            </button>
            <button
              type="button"
              onClick={() => setViewMode("dataset")}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                viewMode === "dataset"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              📁 Katalog Dataset
            </button>
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                viewMode === "analytics"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 size={13} aria-hidden="true" /> Analytics
            </button>
          </div> : null}

          {primaryMode === "business-space" ? (
            <>
              <div className="results-header">
                <div>
                  <span className="eyebrow">Hasil Properti Go</span>
                  <strong>{propertyCandidates.length} observasi properti</strong>
                </div>
                <span className="source-stamp">PROPERTI GO</span>
              </div>
              <div className="result-list" data-property-result-count={propertyCandidates.length}>
                {propertyCandidates.length === 0 ? (
                  <div className="empty-state" role="status">
                    Properti Go tidak ditemukan pada cakupan aktif.
                  </div>
                ) : (
                  propertyCandidates.map((candidate, index) => (
                    <PropertyResultRow
                      key={candidate.id}
                      candidate={candidate}
                      index={index}
                      selected={candidate.id === selectedPropertyId}
                      onSelect={loadSelectedPropertyDetail}
                    />
                  ))
                )}
              </div>
            </>
          ) : primaryMode === "accessibility" ? (
            <>
              <div className="results-header">
                <div>
                  <span className="eyebrow">Accessibility Evidence</span>
                  <strong>{accessibilityEvidence.length} observasi pada viewport</strong>
                </div>
                <span className="source-stamp">EVIDENCE</span>
              </div>
              <div className="result-list" data-accessibility-result-count={accessibilityEvidence.length}>
                {accessibilityEvidence.length === 0 ? (
                  <div className="empty-state" role="status">
                    Belum ada observasi aksesibilitas yang tercatat di area ini.
                  </div>
                ) : (
                  accessibilityEvidence.map((evidence, index) => (
                    <AccessibilityEvidenceResultRow
                      key={evidence.id}
                      evidence={evidence}
                      index={index}
                      selected={evidence.id === selectedAccessibilityEvidenceId}
                      onSelect={loadSelectedAccessibilityEvidenceDetail}
                    />
                  ))
                )}
              </div>
            </>
          ) : viewMode === "fair-discovery" ? (
            <div className="mb-4">
              <FairDiscoveryResults
                result={fairDiscoveryResult}
                isLoading={fairDiscoveryLoading}
                error={fairDiscoveryError}
                selectedId={selectedId}
                onSelectMerchant={(m) => {
                  const match = baseMerchants.find((bm) => bm.id === m.id || bm.name.toLowerCase() === m.name.toLowerCase());
                  if (match) handleSelect(match);
                }}
                onSelectSponsored={(p) => {
                  const match = baseMerchants.find((bm) => bm.id === p.merchant_id || bm.name.toLowerCase() === p.merchant_name.toLowerCase());
                  if (match) handleSelect(match);
                }}
                onRequestRoute={(item) => {
                  const coords = (item as any).geometry?.coordinates || [(item as any).longitude, (item as any).latitude];
                  if (coords && coords.length >= 2) {
                    setRouteDestinationId((item as any).id || (item as any).merchant_id);
                  }
                }}
              />
            </div>
          ) : viewMode === "analytics" ? (
            <DemandIntelligencePanel
              query={analyticsQuery}
              data={analytics.data}
              loading={analytics.loading}
              error={analytics.error}
              selectedRegionId={effectiveAnalyticsRegionId}
              onModeChange={setAnalyticsMode}
              onCategoryChange={setAnalyticsCategory}
              onDaysChange={setAnalyticsDays}
              onSelectRegion={setSelectedAnalyticsRegionId}
            />
          ) : (
            <>
              <div className="results-header">
                <div>
                  <span className="eyebrow">
                    {datasetId === "all-areas"
                      ? "Hasil semua data"
                      : isAdminImportDataset(datasetId)
                        ? `Hasil ${
                            activeAdminImportedLayer
                              ?.layer_name ??
                            adminImportedLayer
                              ?.layer_name ??
                            "import"
                          }`
                        : datasetId === "mapid-food-jakarta-pusat"
                        ? "Hasil MAPID"
                        : "Hasil GeoJSON"}
                  </span>
                  <strong>
                    {merchants.length} dari {baseMerchants.length} titik
                  </strong>
                </div>
                <div className="results-header__actions">
                  {selectedId ? (
                    <button
                      className="show-all-results-button"
                      type="button"
                      onClick={handleClearSelection}
                    >
                      Tampilkan semua
                    </button>
                  ) : null}
                  <span className="source-stamp">
                    {datasetId === "all-areas"
                      ? "ALL"
                      : isAdminImportDataset(datasetId)
                        ? "IMPORT"
                        : datasetId === "mapid-food-jakarta-pusat"
                        ? "MAPID"
                        : "2026"}
                  </span>
                </div>
              </div>

              <div className="result-list">
                {merchants.length === 0 ? (
                  <div className="empty-state" role="status">
                    {searchIntent?.keyword
                      ? `"${searchIntent.keyword}" tidak ditemukan di ${searchIntent.location_text ?? "area ini"}.`
                      : "Tidak ada merchant canonical di area ini."}
                  </div>
                ) : regionResultGroups.length > 0 ? (
                  regionResultGroups.map((group) => (
                    <section className="region-result-group" key={group.id} aria-labelledby={`region-group-${group.id}`}>
                      <header className="region-result-group__header">
                        <h3 id={`region-group-${group.id}`}>{group.name}</h3>
                        <span>{group.merchants.length} hasil pada halaman ini</span>
                      </header>
                      {group.merchants.map((merchant) => (
                        <MerchantResultRow
                          key={merchant.id}
                          merchant={merchant}
                          index={merchants.findIndex((item) => item.id === merchant.id)}
                          selected={merchant.id === selectedMerchant?.id}
                          onSelect={handleSelect}
                        />
                      ))}
                    </section>
                  ))
                ) : (
                  merchants.map((merchant, index) => (
                    <MerchantResultRow
                      key={merchant.id}
                      merchant={merchant}
                      index={index}
                      selected={merchant.id === selectedMerchant?.id}
                      onSelect={handleSelect}
                    />
                  ))
                )}
              </div>
            </>
          )}

          <div className="ai-teaser">
            <Bot size={17} />
            <div>
              <strong>
                Data map siap difilter
              </strong>
              <span>
                {datasetId ===
                "all-areas"
                  ? "Semua layer aktif ditampilkan bersama. Pakai filter cakupan data untuk fokus ke layer import, Jakarta Pusat, atau Jakarta Barat."
                  : isAdminImportDataset(
                      datasetId,
                    )
                    ? `${
                        activeAdminImportedLayer
                          ?.layer_name ??
                        adminImportedLayer
                          ?.layer_name ??
                        "Data hasil import"
                      } tersimpan di database dan dapat digunakan untuk pencarian maupun routing.`
                    : datasetId ===
                      "mapid-food-jakarta-pusat"
                    ? "Layer MAPID dinormalisasi lewat backend GETRA agar bisa dicari, dipilih, dan dipakai routing."
                    : "Aktifkan lokasi perangkat agar daftar diurutkan dari titik kamu saat ini."}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <AiPanel
              activeExperience={activeExperience}
              currentOrigin={routeOrigin?.coordinate}
              currentDestination={selectedMerchant ? { latitude: selectedMerchant.latitude, longitude: selectedMerchant.longitude } : undefined}
              selectedEntityId={selectedMerchant?.id}
            />
          </div>
        </aside>

        <section
          className="map-panel"
          aria-label="Peta GETRA"
          style={{ position: "relative" }}
        >
          {mapPickMode === "ROUTE_START" && (
            <div
              style={{
                position: "absolute",
                top: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                backgroundColor: "#1e293b",
                color: "#eef8fa",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "1px solid #38bdf8",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Pilih titik mulai</strong>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Klik peta untuk menentukan START</span>
              </div>
              <button
                type="button"
                onClick={handleClearManualOrigin}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  backgroundColor: "#334155",
                  border: "none",
                  borderRadius: "4px",
                  color: "#eef8fa",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
            </div>
          )}
          <GetraMap
            datasetKey={datasetId}
            focusBounds={searchFocusBounds}
            focusKey={searchFocusKey}
            merchants={primaryMode === "merchant" ? merchants : []}
            selectedId={primaryMode === "merchant" ? selectedId : null}
            propertyCandidates={primaryMode === "business-space" ? propertyCandidates : []}
            selectedPropertyId={primaryMode === "business-space" ? selectedPropertyId : null}
            accessibilityEvidence={primaryMode === "accessibility" ? accessibilityEvidence : []}
            selectedAccessibilityEvidenceId={primaryMode === "accessibility" ? selectedAccessibilityEvidenceId : null}
            userLocation={userLocation}
            onSelect={handleSelect}
            onSelectProperty={loadSelectedPropertyDetail}
            onSelectAccessibilityEvidence={loadSelectedAccessibilityEvidenceDetail}
            onClearSelection={handleClearSelection}
            onViewportChange={handleViewportChange}
            contextualLayerData={contextualLayerData}
            contextualLayerVisibility={contextualLayerVisibility}
            onContextualLayerChange={handleContextualLayerChange}
            datasetBounds={datasetBounds}
            datasetOrigin={datasetOrigin}
            routeOriginPoint={routeOriginPoint}
            routeDestinationPoint={routeDestinationPoint}
            routeGeometry={route?.geometry}
            serviceAreaGeometry={serviceArea?.geometry ?? null}
            importBoundaries={
              visibleImportBoundaries
            }
            administrativeBoundaries={visibleAdministrativeBoundaries}
            sponsoredPlacements={fairDiscoveryResult?.sponsored}
            onSelectSponsored={() => {
              // Set selection or route point if needed
            }}
            analyticsCollection={analyticsCollection}
            analyticsMode={analyticsMode}
            onSelectAnalyticsRegion={setSelectedAnalyticsRegionId}
            mapPickMode={mapPickMode}
            manualRouteStart={manualRouteStart}
            onMapPick={handleMapPick}
          />
        </section>

        <aside className="right-panel panel" tabIndex={0} aria-label="Detail lokasi terpilih">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Evidence
              </span>
              <h2>
                Detail lokasi
              </h2>
            </div>
            <Database size={20} />
          </div>

          {primaryMode === "business-space" ? (
            <PropertyObservationDetail
              detail={selectedPropertyDetail}
              fallback={propertyCandidates.find((candidate) => candidate.id === selectedPropertyId) ?? null}
              loading={propertyDetailLoading}
            />
          ) : primaryMode === "accessibility" ? (
            <AccessibilityEvidenceDetailPanel
              detail={selectedAccessibilityEvidenceDetail}
              fallback={accessibilityEvidence.find((evidence) => evidence.id === selectedAccessibilityEvidenceId) ?? null}
              loading={accessibilityDetailLoading}
            />
          ) : selectedMerchant ? (
            <>
              <div className="detail-title">
                <span className="source-stamp source-stamp--warning">
                  {selectedMerchant.id.startsWith(
                    "admin-import-",
                  )
                    ? "ADMIN"
                    : selectedMerchant.id.startsWith(
                        "mapid-food-",
                      )
                      ? "MAPID"
                      : "GeoJSON"}
                </span>
                <h3>
                  {selectedMerchant.name}
                </h3>
                <p>
                  {selectedMerchant.brand}
                  {" · "}
                  {selectedMerchant.category}
                </p>
              </div>

              <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setRouteDestinationId(selectedMerchant.id);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: routeDestination?.id === selectedMerchant.id ? "#334155" : "#0284c7",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem"
                  }}
                  disabled={routeDestination?.id === selectedMerchant.id}
                >
                  <Route size={16} /> {routeDestination?.id === selectedMerchant.id ? "Sudah menjadi tujuan" : "Jadikan tujuan rute"}
                </button>
              </div>

              {/* Profile Poster Promotional Placement (Additive Phase 9) */}
              {profilePoster && (
                <div className="mb-3">
                  <ProfilePoster
                    poster={profilePoster}
                    onRequestRoute={() => {
                      if (selectedMerchant) {
                        setRouteDestinationId(selectedMerchant.id);
                      }
                    }}
                  />
                </div>
              )}

              <MerchantMediaGallery merchant={selectedMerchant} />

              <div className="metric-grid">
                <div className="metric">
                  <Coffee size={18} />
                  <span>
                    Brand
                  </span>
                  <strong>
                    {selectedMerchant.brand}
                  </strong>
                </div>
                <div className="metric">
                  <MapPinned size={18} />
                  <span>
                    Kecamatan
                  </span>
                  <strong>
                    {selectedMerchant.district ||
                      "Tidak tersedia"}
                  </strong>
                </div>
                <div className="metric">
                  <Layers3 size={18} />
                  <span>
                    Dari lokasi kamu
                  </span>
                  <strong>
                    {selectedMerchant.userDistanceMeters !==
                    undefined
                      ? `Jarak langsung ${formatDistance(selectedMerchant.userDistanceMeters)}${
                          selectedMerchant.networkDurationSeconds
                            ? ` · ${Math.ceil(selectedMerchant.networkDurationSeconds / 60)} menit jaringan`
                            : ""
                        }`
                      : "Aktifkan GPS"}
                  </strong>
                </div>
                <div className="metric">
                  <CalendarDays size={18} />
                  <span>
                    Status
                  </span>
                  <strong>
                    {selectedMerchant.openingStatus === "OPEN" ||
                    (selectedMerchant.openStatusKnown && selectedMerchant.openNow)
                      ? "BUKA"
                      : selectedMerchant.openingStatus === "CLOSED" ||
                          (selectedMerchant.openStatusKnown && !selectedMerchant.openNow)
                        ? "TUTUP"
                        : "Jam buka tidak tersedia"}
                  </strong>
                </div>
              </div>

              <section className="evidence-section">
                <h4>
                  Rute aktif
                </h4>
                <p className="limitation-box">
                  Gunakan panel Rute commuter di kiri untuk memilih titik mulai dan tujuan. Marker tujuan yang dipilih akan fokus di map, lalu garis rute tampil langsung setelah dihitung.
                </p>
              </section>

              <section className="evidence-section">
                <h4>
                  Alamat
                </h4>
                <p className="limitation-box">
                  {selectedMerchant.address ||
                    "Alamat tidak tersedia pada GeoJSON."}
                </p>
              </section>

              <section className="evidence-section">
                <h4>Wilayah administrasi</h4>
                <p className="limitation-box">
                  {selectedMerchant.city ?? selectedMerchant.regions?.[0] ??
                    "Wilayah belum teridentifikasi."}
                </p>
              </section>

              <MerchantSourceEvidence merchant={selectedMerchant} />

              <section className="evidence-section">
                <h4>
                  Detail tambahan
                </h4>
                <dl className="evidence-list evidence-list--compact">
                  <OptionalDetail label="Desa" value={selectedMerchant.village} />
                  {selectedMerchant.phone ? (
                    <div>
                      <dt>Telepon</dt>
                      <dd><span className="inline-icon-value"><Phone size={12} />{selectedMerchant.phone}</span></dd>
                    </div>
                  ) : null}
                  <OptionalDetail label="Koordinat" value={`${selectedMerchant.latitude.toFixed(6)}, ${selectedMerchant.longitude.toFixed(6)}`} />
                  <OptionalDetail label="Update" value={selectedMerchant.updatedAt} />
                </dl>
              </section>

              <section className="evidence-section">
                <h4>
                  Catatan
                </h4>
                <p className="limitation-box" style={{ color: "#cbd5e1" }}>
                  {selectedMerchant.limitation}
                </p>
              </section>
            </>
          ) : (
            <div className="empty-state">
              Pilih satu titik pada peta atau daftar hasil.
            </div>
          )}
        </aside>
      </section>
      </StakeholderContextShell>
    </main>
  );
}
