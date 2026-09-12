"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  Car,
  Coffee,
  Database,
  Layers3,
  MapPinned,
  Phone,
  Footprints,
  Bike,
  Route,
  Search,
  ShieldCheck,
  Target,
  X,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CoordinateEntry } from "@/src/features/routing/components/coordinate-entry";
import routingStyles from "@/src/features/routing/routing-controls.module.css";
import type { Coordinate } from "@/src/types/spatial";

import { StakeholderModeSwitcher } from "@/src/components/stakeholder/stakeholder-mode-switcher";
import { StakeholderContextShell } from "@/src/components/stakeholder/stakeholder-context-shell";
import { GetraGlobalHeader } from "@/src/components/getra-ui";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import type { AiSearchAction, SearchCriteria } from "@/types/search-recommendation";
import { AiPanel, type AiActionExecutionResult } from "@/components/ai/ai-panel";
import type { AiApplicationAction } from "@/src/services/ai.service";
import { resolveGetraPlace, type ResolvedPlace } from "@/src/features/ai-orchestration/place-resolver";
import { CommunityNotificationsMenu } from "@/src/features/community/components/notifications/community-notifications-menu";

import { GetraMap } from "@/components/getra-map";
import { discoveryMerchant } from "@/src/features/fair-discovery/discovery-merchant";
import { useFairDiscovery, FairDiscoveryResults } from "@/src/features/fair-discovery";
import { useRouting } from "@/src/hooks/use-routing";
import { useCanonicalData } from "@/src/hooks/useCanonicalData";
import { useActiveJourney } from "@/src/hooks/use-active-journey";
import { JourneyControls } from "@/src/features/routing/components/journey-controls";
import { RouteSelectionSheet } from "@/src/features/routing/components/route-selection-sheet";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useDestinationMerchantSearch } from "@/src/features/routing/hooks/use-destination-merchant-search";
import type { RoutePreference, RoutingMode } from "@/src/services/routing.service";
import {
  mapidLayerService,
  type CanonicalMerchantLayer,
  type GlobalSearchIntent,
  type MapViewportBounds,
  type SearchRegion,
} from "@/src/services/mapid-layer.service";
import { CommuterSidebar, type SidebarMode } from "@/src/features/global-search/components/commuter-sidebar";
import { MerchantResultRow } from "@/src/features/global-search/components/merchant-result-row";
import { PlaceDetailDrawer } from "@/src/features/global-search/components/place-detail-drawer";
import { useSponsoredPinCandidates } from "@/src/features/umkm-advertising";
import "@/src/features/global-search/commuter-sidebar.css";
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
import { commuterService, type WalkingServiceArea } from "@/src/services/commuter.service";
import type { Merchant, UserLocation } from "@/types/getra";
import { classifyEntityQuery } from "@/types/entity-resolution";
import { useDemandIntelligence } from "@/src/features/demand-intelligence/hooks/use-demand-intelligence";
import { DemandIntelligencePanel } from "@/src/features/demand-intelligence/components/demand-intelligence-panel";
import type {
  AnalyticsCategorySlug,
  AnalyticsMapCollection,
  AnalyticsMode,
  AnalyticsQuery,
} from "@/src/features/demand-intelligence/types/demand-intelligence.types";
import { businessSpaceService } from "@/src/features/business-space/services/business-space.service";
import { BusinessSpaceWorkspace } from "@/src/features/business-space/components/business-space-workspace";
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
  { id: "", label: "Area peta saat ini" },
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
  { value: "GETRA_COMMUNITY", label: "Komunitas GETRA" },
];

const ACCESSIBILITY_CATEGORY_OPTIONS: Array<{ value: "" | AccessibilityEvidenceCategory; label: string }> = [
  { value: "", label: "Semua kategori" },
  { value: "ACCESSIBILITY_OBSERVATION", label: "Aksesibilitas" },
  { value: "PEDESTRIAN_OBSERVATION", label: "Pejalan kaki" },
  { value: "TRANSIT_OBSERVATION", label: "Transit" },
  { value: "UNCLASSIFIED", label: "Belum terklasifikasi" },
];

const ACCESSIBILITY_STATUS_OPTIONS: Array<{ value: "" | AccessibilityValidationStatus; label: string }> = [
  { value: "", label: "Semua status" },
  { value: "OBSERVED", label: "Observasi" },
  { value: "NEEDS_REVIEW", label: "Perlu verifikasi" },
  { value: "CONFIRMED", label: "Terkonfirmasi" },
  { value: "STALE", label: "Perlu diperbarui" },
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

function routeModeLabel(mode: RoutingMode) {
  return mode === "walking" ? "Jalan kaki" : mode === "motorcycle" ? "Motor" : "Mobil";
}

function freshnessLabel(value: string | null | undefined) {
  if (value === "FRESH") return "Masih baru";
  if (value === "AGING") return "Perlu diperiksa";
  if (value === "STALE") return "Perlu konfirmasi ulang";
  return "Waktu pembaruan belum diketahui";
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
      return "Observasi pejalan kaki";
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
      return "Jalur pemandu";
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
    ? "Komunitas GETRA"
    : "Aktivitas MAPID";
}

function accessibilityRelationLabel(value: string | null | undefined) {
  if (value === "CONFIRMED_RELATION") return "Sudah dikonfirmasi";
  if (value === "REJECTED_RELATION") return "Tidak terkait";
  return "Perlu diperiksa";
}

function formatNullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "Data belum cukup";
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
        <h4>Detail catatan properti</h4>
        <dl className="evidence-list evidence-list--compact">
          <OptionalDetail label="Kategori properti" value={candidate.property_category} />
          <OptionalDetail label="Jenis" value={transactionLabel(candidate.property_transaction_type)} />
          <OptionalDetail label="Alamat" value={candidate.address} />
          <OptionalDetail label="Waktu pengamatan" value={candidate.observed_at} />
          <OptionalDetail label="Pembaruan data" value={freshnessLabel(candidate.freshness)} />
          <OptionalDetail label="Wilayah" value={detail?.administrative_context.region_name} />
          <OptionalDetail label="Sumber" value="Properti Go" />
        </dl>
      </section>
      <section className="evidence-section">
        <h4>Analisis lokasi usaha</h4>
        {loading ? (
          <p className="limitation-box" role="status">Sedang menilai lokasi usaha...</p>
        ) : detail ? (
          <dl className="evidence-list evidence-list--compact">
            <OptionalDetail label="Kebutuhan sekitar" value={formatNullableNumber(detail.market_context.demand_score)} />
            <OptionalDetail label="Usaha sejenis" value={formatNullableNumber(detail.market_context.supply_score)} />
            <OptionalDetail label="Celah kebutuhan" value={formatNullableNumber(detail.market_context.retail_gap)} />
            <OptionalDetail label="Transit terdekat" value={detail.transit_context.nearest ? `${detail.transit_context.nearest.network_walking_minutes} menit berjalan kaki` : "Tidak tersedia"} />
            <OptionalDetail label="Jangkauan berjalan" value={detail.walking_context.status === "ROUTABLE" ? `${detail.walking_context.catchment_minutes} menit` : "Tidak tersedia"} />
          </dl>
        ) : (
          <p className="limitation-box">Pilih catatan properti untuk melihat kondisi area. Informasi ini tidak memastikan ketersediaan saat ini.</p>
        )}
      </section>
      <section className="evidence-section">
        <h4>Catatan</h4>
        <p className="limitation-box">Catatan Properti Go berasal dari pengamatan sebelumnya. Ketersediaan jual atau sewa perlu dikonfirmasi kembali.</p>
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
        <strong>{evidence.routing_effect_enabled ? "Aktif" : "Belum aktif"}</strong>
        <span>pengaruh pada rute</span>
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
    return <div className="empty-state">Pilih catatan aksesibilitas pada peta atau daftar hasil.</div>;
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
          <OptionalDetail label="Pembaruan data" value={freshnessLabel(evidence.freshness_status)} />
          <OptionalDetail label="Waktu pengamatan" value={evidence.observed_at} />
          <OptionalDetail label="Sumber" value={accessibilitySourceLabel(evidence.source_type)} />
          <OptionalDetail label="Deskripsi" value={evidence.description} />
        </dl>
      </section>
      <section className="evidence-section">
        <h4>Keterkaitan dengan jalur pejalan kaki</h4>
        {loading ? (
          <p className="limitation-box" role="status">Sedang memeriksa akses jalan kaki...</p>
        ) : detail?.spatial_relation ? (
          <dl className="evidence-list evidence-list--compact">
            <OptionalDetail label="Jenis jalur" value="Jalur pejalan kaki" />
            <OptionalDetail label="Jarak ke jalur" value={`${detail.spatial_relation.distance_m} m`} />
            <OptionalDetail label="Keterkaitan" value={accessibilityRelationLabel(detail.spatial_relation.relation_status)} />
            <OptionalDetail label="Pengaruh pada rute" value="Belum digunakan dalam perhitungan rute" />
          </dl>
        ) : (
          <p className="limitation-box">Belum ada jalur yang cukup dekat dengan catatan ini. Catatan tersebut tidak mengubah rute.</p>
        )}
      </section>
      <section className="evidence-section">
        <h4>Batas klaim</h4>
        <p className="limitation-box">
          Informasi ini berasal dari temuan lapangan atau kontribusi yang telah diperiksa. Catatan tersebut belum digunakan untuk menyatakan rute berbahaya atau mengubah perhitungan rute.
        </p>
      </section>
    </>
  );
}

function MerchantMediaGallery({ merchant }: { merchant: Merchant }) {
  const items = [
    { label: "Foto tempat", src: merchant.photo },
    ...(merchant.menuPhotos ?? []).slice(0, 2).map((src, index) => ({
      label: `Foto menu ${index + 1}`,
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
          <OptionalDetail label="Waktu pengamatan" value={merchant.observedAt} />
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

function deduplicateMerchants<T extends Merchant>(merchants: T[]): T[] {
  return [...new Map(merchants.map((merchant) => [merchant.id, merchant])).values()];
}

export function merchantFocusBounds(merchant: Pick<Merchant, "latitude" | "longitude">) {
  const padding = 0.006;
  return {
    west: merchant.longitude - padding,
    south: merchant.latitude - padding,
    east: merchant.longitude + padding,
    north: merchant.latitude + padding,
  };
}

function calculateMerchantBounds(
  merchants: Merchant[],
  fallbackOrigin: { longitude: number; latitude: number } = COFFEE_SHOP_ORIGIN,
) {
  if (merchants.length === 0) {
    return {
      west: fallbackOrigin.longitude - 0.04,
      south: fallbackOrigin.latitude - 0.04,
      east: fallbackOrigin.longitude + 0.04,
      north: fallbackOrigin.latitude + 0.04,
    };
  }

  const raw = merchants.reduce(
    (bounds, merchant) => ({
      west: Math.min(bounds.west, merchant.longitude),
      south: Math.min(bounds.south, merchant.latitude),
      east: Math.max(bounds.east, merchant.longitude),
      north: Math.max(bounds.north, merchant.latitude),
    }),
    {
      west: merchants[0]?.longitude ?? fallbackOrigin.longitude,
      south: merchants[0]?.latitude ?? fallbackOrigin.latitude,
      east: merchants[0]?.longitude ?? fallbackOrigin.longitude,
      north: merchants[0]?.latitude ?? fallbackOrigin.latitude,
    },
  );

  const minSpan = 0.04;
  const spanLng = Math.abs(raw.east - raw.west);
  const spanLat = Math.abs(raw.north - raw.south);
  const centerLng = (raw.west + raw.east) / 2;
  const centerLat = (raw.south + raw.north) / 2;

  return {
    west: spanLng < minSpan ? centerLng - minSpan / 2 : raw.west,
    east: spanLng < minSpan ? centerLng + minSpan / 2 : raw.east,
    south: spanLat < minSpan ? centerLat - minSpan / 2 : raw.south,
    north: spanLat < minSpan ? centerLat + minSpan / 2 : raw.north,
  };
}

function calculateMerchantOrigin(
  merchants: Merchant[],
  fallback: {
    name: string;
    longitude: number;
    latitude: number;
  } = COFFEE_SHOP_ORIGIN,
) {
  const bounds = calculateMerchantBounds(merchants, fallback);

  return {
    id: "active-dataset-center",
    name: fallback.name,
    longitude: (bounds.west + bounds.east) / 2,
    latitude: (bounds.south + bounds.north) / 2,
  };
}

const KNOWN_REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  makasar: { latitude: -5.1477, longitude: 119.4327 },
  makassar: { latitude: -5.1477, longitude: 119.4327 },
  aceh: { latitude: 3.8333, longitude: 96.8833 },
  gresik: { latitude: -7.1566, longitude: 112.6555 },
  bekasi: { latitude: -6.2383, longitude: 106.9756 },
  selatan: { latitude: -6.2615, longitude: 106.8106 },
  timur: { latitude: -6.2250, longitude: 106.9004 },
  barat: { latitude: -6.1683, longitude: 106.7588 },
  pusat: { latitude: -6.1805, longitude: 106.8284 },
  utara: { latitude: -6.1384, longitude: 106.8640 },
  bandung: { latitude: -6.9175, longitude: 107.6191 },
  surabaya: { latitude: -7.2575, longitude: 112.7521 },
};

function extractCoordinatesFromGeometry(geometry: GeoJSON.Geometry | null | undefined): Array<[number, number]> {
  if (!geometry) return [];
  if (geometry.type === "Point") return [geometry.coordinates as [number, number]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates as Array<[number, number]>;
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return (geometry.coordinates as Array<Array<[number, number]>>).flat();
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as Array<Array<Array<[number, number]>>>).flat(2);
  }
  return [];
}

function getDatasetTargetBounds(
  targetDatasetId: DatasetId,
  adminImportedLayers: AdminImportedLayer[],
  allMerchants: Merchant[],
  mapidMerchants: Merchant[],
): MapViewportBounds | null {
  if (targetDatasetId === "all-areas") {
    if (allMerchants.length > 0) {
      return calculateMerchantBounds(allMerchants);
    }
    return {
      west: 106.65,
      south: -6.40,
      east: 107.05,
      north: -6.10,
    };
  }

  if (targetDatasetId === "coffee-jakarta-barat") {
    return calculateMerchantBounds(COFFEE_SHOPS);
  }

  if (targetDatasetId === "mapid-food-jakarta-pusat") {
    if (mapidMerchants.length > 0) {
      return calculateMerchantBounds(mapidMerchants);
    }
    return {
      west: 106.80,
      south: -6.22,
      east: 106.86,
      north: -6.16,
    };
  }

  if (isAdminImportDataset(targetDatasetId)) {
    const layerId = getAdminImportLayerId(targetDatasetId);
    const layer = adminImportedLayers.find((l) => l.layer_id === layerId);
    if (layer) {
      if (layer.merchants && layer.merchants.length > 0) {
        return calculateMerchantBounds(layer.merchants);
      }

      if (layer.boundaries?.features && layer.boundaries.features.length > 0) {
        let minLng = Infinity;
        let minLat = Infinity;
        let maxLng = -Infinity;
        let maxLat = -Infinity;

        for (const feature of layer.boundaries.features) {
          const coords = extractCoordinatesFromGeometry(feature.geometry);
          for (const [lng, lat] of coords) {
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }

        if (minLng !== Infinity && minLat !== Infinity) {
          const minSpan = 0.04;
          const spanLng = maxLng - minLng;
          const spanLat = maxLat - minLat;
          const centerLng = (minLng + maxLng) / 2;
          const centerLat = (minLat + maxLat) / 2;
          return {
            west: spanLng < minSpan ? centerLng - minSpan / 2 : minLng,
            east: spanLng < minSpan ? centerLng + minSpan / 2 : maxLng,
            south: spanLat < minSpan ? centerLat - minSpan / 2 : minLat,
            north: spanLat < minSpan ? centerLat + minSpan / 2 : maxLat,
          };
        }
      }

      const lowerName = (layer.layer_name || "").toLowerCase();
      for (const [key, center] of Object.entries(KNOWN_REGION_CENTERS)) {
        if (lowerName.includes(key)) {
          return {
            west: center.longitude - 0.035,
            east: center.longitude + 0.035,
            south: center.latitude - 0.035,
            north: center.latitude + 0.035,
          };
        }
      }
    }
  }

  return null;
}

export function GetraDashboard() {
  const { activeExperience, experienceReady } = useStakeholder();

  if (!experienceReady) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <span>Menyiapkan pengalaman GETRA...</span>
      </div>
    );
  }

  if (activeExperience === "INVESTOR") {
    return (
      <div className="workspace" data-active-experience="INVESTOR">
        <GetraGlobalHeader
          utilities={<CommunityNotificationsMenu />}
        />
        <div className="workspace-context-toolbar"><StakeholderModeSwitcher /></div>
        <StakeholderContextShell>
          <BusinessSpaceWorkspace />
        </StakeholderContextShell>
      </div>
    );
  }

  return <GeneralGetraDashboard />;
}

function GeneralGetraDashboard() {
  const { activeExperience } = useStakeholder();

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

  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("search");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchIntent, setSearchIntent] = useState<GlobalSearchIntent | null>(null);
  const [searchRegions, setSearchRegions] = useState<SearchRegion[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [placeSearchStatus, setPlaceSearchStatus] = useState<string | null>(null);
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

  const [mapPickMode, setMapPickMode] = useState<"NONE" | "ROUTE_START" | "ROUTE_DESTINATION">("NONE");
  const [manualRouteStart, setManualRouteStart] = useState<{ latitude: number; longitude: number } | null>(null);
  const [manualRouteDestination, setManualRouteDestination] = useState<Coordinate | null>(null);
  const [manualRouteDestinationLabel, setManualRouteDestinationLabel] = useState("Titik tujuan di peta");

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

  const [routeDestinationMerchant, setRouteDestinationMerchant] = useState<Merchant | null>(null);

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

  const allMerchants =
    useMemo(
      () => deduplicateMerchants([
        ...(adminImportedLayer?.merchants ??
          []),
        ...mapidMerchants,
        ...(datasetId === "coffee-jakarta-barat" ? COFFEE_SHOPS : []),
      ]),
      [
        adminImportedLayer,
        mapidMerchants,
        datasetId,
      ],
    );

  const [destinationSearchActive, setDestinationSearchActive] = useState(false);
  const {
    results: canonicalDestinationResults,
    loading: destinationSearchLoading,
    error: destinationSearchError,
  } = useDestinationMerchantSearch(destinationSearch, destinationSearchActive);

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
          ? mapidMerchants
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
        datasetId,
        fallbackAdminImportedMerchants,
        mapidMerchants,
      ],
    );

  const datasetSourceName =
    datasetId ===
      "all-areas"
      ? mapidLayerName
      : isAdminImportDataset(
          datasetId,
        )
        ? activeAdminImportedLayer
            ?.limitation ??
          adminImportedLayer
            ?.limitation ??
          "Data impor"
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
                        "data impor"
                      }`,
                  },
                ),
                name:
                  `Pusat sebaran ${
                    activeAdminImportedLayer
                      ?.layer_name ??
                    adminImportedLayer
                      ?.layer_name ??
                    "data impor"
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
  const [discoveryRadius, setDiscoveryRadius] = useState(3000);
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
      radiusMeters: discoveryRadius,
      category: brand !== "Semua" ? brand : undefined,
      query: query || undefined,
      openNow: openOnly,
    };
  }, [userLocation, datasetOrigin, brand, query, openOnly, discoveryRadius]);

  const {
    result: fairDiscoveryResult,
    isLoading: fairDiscoveryLoading,
    error: fairDiscoveryError,
  } = useFairDiscovery({
    query: discoveryQuery,
    enabled: viewMode === "fair-discovery" && Boolean(userLocation),
  });

  const datasetBounds =
    useMemo(
      () =>
        calculateMerchantBounds(
          baseMerchants,
          datasetOrigin,
        ),
      [
        baseMerchants,
        datasetOrigin,
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
            (merchant.openingStatus !== "OPEN" && (!merchant.openStatusKnown || !merchant.openNow))
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

      return withDistance;
    }, [
      brand,
      baseMerchants,
      openOnly,
      userLocation,
    ]);

  const mapMerchants = useMemo<LocatedMerchant[]>(
    () => sidebarMode === "route" && routeDestinationMerchant
      ? [routeDestinationMerchant]
      : deduplicateMerchants<LocatedMerchant>([
      ...(viewMode === "fair-discovery" ? [
        ...(fairDiscoveryResult?.original ?? []), ...(fairDiscoveryResult?.hidden_gems ?? []),
        ...(fairDiscoveryResult?.sponsored.filter((item) => item.merchant_id === selectedId) ?? []),
      ].map(discoveryMerchant) : merchants),
      ...(routeDestinationMerchant ? [routeDestinationMerchant] : []),
    ]),
    [merchants, routeDestinationMerchant, sidebarMode, viewMode, fairDiscoveryResult, selectedId],
  );

  const selectedMerchant =
    mapMerchants.find(
      (merchant) =>
        merchant.id ===
        selectedId,
    ) ?? null;

  const sponsoredContext = useMemo(() => {
    if (searchIntent?.reference) return {
      longitude: searchIntent.reference.longitude,
      latitude: searchIntent.reference.latitude,
    };
    if (userLocation) return { longitude: userLocation.longitude, latitude: userLocation.latitude };
    if (!searchIntent?.scope.bounds) return null;
    const bounds = searchIntent.scope.bounds;
    return {
      longitude: (bounds.west + bounds.east) / 2,
      latitude: (bounds.south + bounds.north) / 2,
    };
  }, [searchIntent, userLocation]);
  const { candidates: sponsoredCandidates } = useSponsoredPinCandidates({
    context: sponsoredContext,
    limit: 5,
    enabled: searchActive && primaryMode === "merchant" && viewMode === "dataset",
  });
  const eligibleSponsoredPlacements = useMemo(
    () => sponsoredCandidates.filter((candidate) => merchants.some((merchant) => merchant.id === candidate.merchant_id)),
    [merchants, sponsoredCandidates],
  );
  const eligibleSponsoredMerchants = useMemo(
    () => eligibleSponsoredPlacements.map((placement) => merchants.find((merchant) => merchant.id === placement.merchant_id))
      .filter((merchant): merchant is LocatedMerchant => Boolean(merchant)),
    [eligibleSponsoredPlacements, merchants],
  );

  useEffect(() => {
    if (viewMode !== "fair-discovery" || !selectedId) return;
    const row = document.querySelector(`.commuter-sidebar [data-merchant-id="${CSS.escape(selectedId)}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, viewMode]);

  const regionResultGroups = useMemo(
    () => selectedRegionIds.length > 0
      ? groupMerchantsByRegion(merchants, selectedRegionIds, searchRegions)
      : [],
    [merchants, searchRegions, selectedRegionIds],
  );
  const resultPresentation = useMemo(() => {
    if (searchIntent?.recommendation) return { title: "Rekomendasi sesuai kebutuhanmu", count: `${merchants.length} tempat paling sesuai` };
    if (searchIntent?.reference?.type === "USER_LOCATION") return {
      title: "Tempat di sekitar Anda",
      count: `${merchants.length} tempat dalam radius ${searchIntent.radius_meters ?? 500} m`,
    };
    if (searchIntent?.reference) return {
      title: `Tempat dekat ${searchIntent.reference.label}`,
      count: `${merchants.length} tempat dalam radius ${searchIntent.radius_meters ?? 500} m`,
    };
    if (selectedRegionIds.length === 1) {
      const region = searchRegions.find((item) => item.id === selectedRegionIds[0]);
      if (region) return { title: `Tempat di ${region.name}`, count: `${merchants.length} tempat ditemukan` };
    }
    return {
      title: "Hasil pencarian",
      count: `${merchants.length} tempat${searchTotal !== null && searchTotal > merchants.length ? ` dari ${searchTotal} hasil` : " ditemukan"}`,
    };
  }, [merchants.length, searchIntent, searchRegions, searchTotal, selectedRegionIds]);

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

  const destinationSearchResults = destinationSearchActive
    ? canonicalDestinationResults
    : [];

  const routeDestination = useMemo(() => (
    manualRouteDestination ? {
      ...manualRouteDestination, id: undefined, name: manualRouteDestinationLabel, district: null, city: null,
    } : routeDestinationMerchant ?? mapMerchants.find(
      (merchant) =>
        merchant.id ===
        routeDestinationId,
    ) ?? null), [manualRouteDestination, manualRouteDestinationLabel, routeDestinationMerchant, mapMerchants, routeDestinationId]);

  const routeOrigin = useMemo(() => (
    routeOriginValue === ROUTE_ORIGIN_MANUAL && manualRouteStart
      ? {
          label: "Titik pilihan di peta",
          coordinate: manualRouteStart,
        }
      : routeOriginValue === ROUTE_ORIGIN_USER && userLocation
        ? {
            label: "Lokasi saya",
            coordinate: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          }
        : explicitRouteOrigin && (routeOriginValue.startsWith("MERCHANT:") || routeOriginValue.startsWith("PLACE:"))
          ? { label: explicitRouteOrigin.label, coordinate: explicitRouteOrigin.coordinate }
          : null
  ), [
    explicitRouteOrigin,
    manualRouteStart,
    routeOriginValue,
    userLocation,
  ]);

  const { context: authContext } = useAuth();
  // General starts context-free. Transit/study-area data is fetched only after
  // a user activates search or route context.
  const canonical = useCanonicalData(
    searchActive || Boolean(routeDestination) ? authContext?.user.id ?? null : null,
  );
  const [activeMode, setActiveMode] = useState<RoutingMode>("walking");
  const [routeModeSelectionRequired, setRouteModeSelectionRequired] = useState(false);
  const [routePreference, setRoutePreference] = useState<RoutePreference>("FASTEST");
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [editingEndpoints, setEditingEndpoints] = useState(false);
  const journey = useActiveJourney(routeDestination, activeMode, routePreference);
  const journeyOpen = journey.state !== "PREVIEW" && journey.state !== "STOPPED";
  const preview = useRouting({
    origin: routeOrigin?.coordinate ?? null,
    destination: routeDestination,
    destinationMerchantId: routeDestination?.id,
    enabled: !journeyOpen && !routeModeSelectionRequired,
    mode: activeMode,
    preference: routePreference,
  });
  const { clearRoute } = preview;
  const route = journeyOpen ? journey.route : preview.route;
  const routingState = journeyOpen ? route ? "ROUTABLE" : journey.state === "ERROR" ? "ERROR" : "LOADING" : preview.state;
  const routingError = journeyOpen ? journey.error : preview.error;
  const authRequired = journeyOpen ? journey.authRequired : preview.authRequired;
  const journeyPosition = journey.position;
  useEffect(() => {
    if (!journeyPosition) return;
    const timer = window.setTimeout(() => setUserLocation({
        latitude: journeyPosition.latitude,
        longitude: journeyPosition.longitude,
        accuracyMeters: Math.round(journeyPosition.accuracyMeters),
        capturedAt: journeyPosition.capturedAt,
      }), 0);
    return () => window.clearTimeout(timer);
  }, [journeyPosition]);
  useEffect(() => {
    if (!authContext) journey.controller.sessionLost();
  }, [authContext, journey.controller]);

  const routeOriginPoint = useMemo(() => routeOrigin
    ? {
        label: routeOrigin.label,
        latitude: routeOrigin.coordinate.latitude,
        longitude: routeOrigin.coordinate.longitude,
      }
    : null, [routeOrigin]);

  const routeDestinationPoint = useMemo(() =>
    routeDestination
      ? {
          label:
            routeDestination.name,
          latitude:
            routeDestination.latitude,
          longitude:
            routeDestination.longitude,
        }
      : null, [routeDestination]);

  const handleSelect =
    useCallback(
      (
        merchant: Merchant,
      ) => {
        suppressNextViewportRef.current = true;
        setSelectedId(merchant.id);
      },
      [],
    );

  const clearRouteDestination = useCallback(() => {
    setManualRouteDestination(null);
    setManualRouteDestinationLabel("Titik tujuan di peta");
    setRouteDestinationId(null);
    setRouteDestinationMerchant(null);
    setDestinationSearch("");
    setDestinationSearchActive(false);
    setPendingRouteChoice(null);
    setRouteModeSelectionRequired(false);
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

  const searchRevisionRef = useRef(0);
  const canonicalSearchGenerationRef = useRef(0);
  const recommendationRef = useRef(false);
  const searchCriteriaRef = useRef<SearchCriteria | null>(null);
  const [aiSearchCriteria, setAiSearchCriteria] = useState<SearchCriteria | null>(null);
  const skipFilterSearchRef = useRef(false);
  const pendingNearbySearchRef = useRef(false);

  const executeCanonicalSearch =
    useCallback(async ({
      bbox,
      queryText,
      regionIds,
      activate,
      focus,
      filters,
    }: {
      filters?: { budget: string; open: boolean; walking: number | null };
      bbox: MapViewportBounds;
      queryText: string;
      regionIds: string[];
      activate: boolean;
      focus: boolean;
    }) => {
      const generation = ++canonicalSearchGenerationRef.current;
      canonicalRequestRef.current?.abort();
      serviceAreaRequestRef.current?.abort();
      if (!activate) {
        setMapidMerchants([]);
        setMapidError(null);
        setMapidLoading(false);
        setSearchIntent(null);
        setSearchTotal(null);
        activeSearchRef.current = false;
        setSearchActive(false);
        return undefined;
      }
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
              referenceText: searchCriteriaRef.current?.reference_text ?? undefined,
              radiusMeters: searchCriteriaRef.current?.radius_meters ?? undefined,
              sort: searchCriteriaRef.current?.sort,
              recommendation: recommendationRef.current,
              maxBudget: Number(filters?.budget ?? maxBudget) >= 1_000 ? Number(filters?.budget ?? maxBudget) : undefined,
              openNow: (filters?.open ?? openOnly) || undefined,
              maxWalkingMinutes: (filters ? filters.walking : maxWalkingMinutes) ?? undefined,
              origin: userLocation ? {
                longitude: userLocation.longitude,
                latitude: userLocation.latitude,
                source: "USER_LOCATION",
              } : undefined,
            },
          );

        if (controller.signal.aborted || generation !== canonicalSearchGenerationRef.current) return;
        setMapidMerchants(
          layer.merchants,
        );
        setMapidLayerName(
          layer.layer_name,
        );
        setSearchIntent(layer.intent);
        if (activate && queryText.trim()) setQuery(layer.intent.keyword ?? "");
        skipFilterSearchRef.current = maxBudget !== (layer.intent.constraints.budget ? String(layer.intent.constraints.budget.max_idr) : "")
          || openOnly !== Boolean(layer.intent.constraints.opening) || maxWalkingMinutes !== (layer.intent.constraints.walking?.max_minutes ?? null);
        setMaxBudget(layer.intent.constraints.budget ? String(layer.intent.constraints.budget.max_idr) : "");
        setOpenOnly(Boolean(layer.intent.constraints.opening));
        setMaxWalkingMinutes(layer.intent.constraints.walking?.max_minutes ?? null);
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
            if (!serviceAreaController.signal.aborted && generation === canonicalSearchGenerationRef.current) setServiceArea(area);
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
        if (focus && (layer.intent.scope.type !== "CURRENT_VIEWPORT" || layer.intent.reference)) {
          suppressNextViewportRef.current = true;
          setSearchFocusBounds(layer.intent.scope.bounds);
          setSearchFocusKey((key) => key + 1);
        }
        return layer;
      } catch {
        if (controller.signal.aborted) return;
        setMapidMerchants([]);
        setMapidError("Tempat di area peta belum dapat dimuat. Coba lagi.");
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
      userLocation,
    ]);

  const applyAiSearch = useCallback(async (action: AiSearchAction, recommendation = true) => {
    const searchRevision = searchRevisionRef.current;
    recommendationRef.current = recommendation;
    const criteria = action.criteria;
    searchCriteriaRef.current = criteria;
    setAiSearchCriteria(criteria);
    setPrimaryMode("merchant"); setDatasetId("all-areas"); setViewMode("dataset");
    setSidebarMode("search"); setSidebarCollapsed(false); setBrand("Semua"); setQuery(criteria.query);
    const layer = await executeCanonicalSearch({ bbox: currentViewportRef.current ?? datasetBounds,
      queryText: criteria.query, regionIds: criteria.reference_text || criteria.near_user ? [] : selectedRegionIds,
      activate: true, focus: true,
      filters: { budget: criteria.max_budget ? String(criteria.max_budget) : "", open: criteria.open_now, walking: criteria.max_walking_minutes } });
    if (searchRevision !== searchRevisionRef.current) return "";
    if (!layer) return "Tempat belum dapat dimuat. Coba lagi atau periksa nama acuan lokasi.";
    const count = layer.merchants.length;
    return count ? `Saya sudah menampilkan ${count} tempat di sidebar dan menandainya di peta.${layer.intent.candidate_limited ? " Hasil terbatas pada kandidat yang tersedia; persempit area untuk hasil lebih lengkap." : ""} Penilaian rasa belum dapat dipastikan tanpa ulasan.`
      : "Belum ada tempat yang ditemukan dengan kebutuhan ini. Coba perluas radius atau ubah anggaran.";
  }, [executeCanonicalSearch, datasetBounds, selectedRegionIds]);

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
    } catch {
      if (controller.signal.aborted) return;
      setPropertyCandidates([]);
      setSelectedPropertyId(null);
      setPropertyError("Ruang usaha belum dapat dimuat. Coba lagi.");
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
    } catch {
      if (controller.signal.aborted) return;
      setAccessibilityEvidence([]);
      setAccessibilityNeed(null);
      setSelectedAccessibilityEvidenceId(null);
      setAccessibilityError("Informasi aksesibilitas belum dapat dimuat. Coba lagi.");
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
    // A viewport move is not a search. Keep the initial map free of merchant
    // queries until the user supplies a meaningful context.
  }, [
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
    searchRevisionRef.current++;
    const revision = searchRevisionRef.current;
    searchCriteriaRef.current = null;
    setAiSearchCriteria(null);
    recommendationRef.current = false;
    setDatasetId("all-areas");
    setViewMode("dataset");
    setPlaceSearchStatus(null);
    if (classifyEntityQuery(query) === "PLACE") {
      void resolveGetraPlace(query, canonical.data.transportNodes).then((resolution) => {
        if (revision !== searchRevisionRef.current) return;
        if (resolution.status === "AMBIGUOUS") {
          setPlaceSearchStatus(`Lokasinya belum unik. Pilih nama yang lebih lengkap: ${resolution.candidates.join(", ")}.`);
          return;
        }
        if (resolution.status === "RESOLVED") {
          const place = resolution.place;
          setMapidMerchants([]);
          setSearchTotal(null);
          activeSearchRef.current = false;
          setSearchActive(false);
          setPlaceSearchStatus(`${place.label} ditemukan dan difokuskan di peta.`);
          suppressNextViewportRef.current = true;
          setSearchFocusBounds(place.merchant ? merchantFocusBounds(place.merchant) : {
            west: place.coordinate.longitude - 0.006,
            south: place.coordinate.latitude - 0.006,
            east: place.coordinate.longitude + 0.006,
            north: place.coordinate.latitude + 0.006,
          });
          setSearchFocusKey((key) => key + 1);
          if (place.merchant) setSelectedId(place.merchant.id);
          return;
        }
        setPlaceSearchStatus(`Lokasi "${query}" belum ditemukan. Periksa kembali nama atau alamatnya.`);
      }).catch(() => {
        if (revision === searchRevisionRef.current) setPlaceSearchStatus("Lokasi belum dapat dicari saat ini. Coba lagi.");
      });
      return;
    }
    const activate = Boolean(query.trim() || selectedRegionIds.length || maxBudget || openOnly || maxWalkingMinutes);
    void executeCanonicalSearch({
      bbox: currentViewportRef.current ?? datasetBounds,
      queryText: query,
      regionIds: selectedRegionIds,
      activate,
      focus: true,
    });
  }, [canonical.data.transportNodes, datasetBounds, executeCanonicalSearch, maxBudget, maxWalkingMinutes, openOnly, query, selectedRegionIds]);

  useEffect(() => {
    if (datasetId !== "all-areas" || primaryMode !== "merchant" || viewMode !== "dataset") return;
    if (skipFilterSearchRef.current) { skipFilterSearchRef.current = false; return; }
    const timer = window.setTimeout(() => {
      void executeCanonicalSearch({ bbox: currentViewportRef.current ?? datasetBounds,
        queryText: query, regionIds: selectedRegionIds, activate: Boolean(query.trim() || selectedRegionIds.length || maxBudget || openOnly || maxWalkingMinutes), focus: false });
    }, 350);
    return () => window.clearTimeout(timer);
    // Submit text explicitly; changes to constraints apply after a short debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxBudget, openOnly, maxWalkingMinutes]);

  const toggleSearchRegion = useCallback((regionId: string) => {
    searchRevisionRef.current++;
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
    searchRevisionRef.current++;
    searchCriteriaRef.current = null;
    setAiSearchCriteria(null);
    recommendationRef.current = false;
    setQuery("");
    setBrand("Semua");
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
    canonicalRequestRef.current?.abort();
    setMapidMerchants([]);
    setMapidError(null);
    setMapidLoading(false);
    setPlaceSearchStatus(null);
  }, []);

  const searchCurrentArea = useCallback(() => {
    searchRevisionRef.current++;
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

  const activateAccessibilityMode = useCallback(() => {
    setPrimaryMode("accessibility");
    setViewMode("dataset");
    setSelectedId(null);
    setSelectedPropertyId(null);
    setSelectedPropertyDetail(null);
    setPropertyCandidates([]);
    setRouteDestinationId(null);
    setRouteDestinationMerchant(null);
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
                  `${result.total_layers} lapisan data tersimpan`,
                source_type:
                  "JSON_PAYLOAD",
                total_features:
                  result.total_features,
                merchants,
                persisted:
                  true,
                limitation:
                  "Data tersimpan dan siap digunakan di peta.",
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
        setRouteDestinationMerchant(null);
        setOriginSearch(
          "",
        );
        setDestinationSearch(
          "",
        );
        setDestinationSearchActive(false);
        setPendingRouteChoice(
          null,
        );
        setRouteOriginValue(
          ROUTE_ORIGIN_NONE,
        );
        setExplicitRouteOrigin(null);
        clearRoute();

        const targetBounds = getDatasetTargetBounds(
          nextDatasetId,
          adminImportedLayers,
          allMerchants,
          mapidMerchants,
        );
        if (targetBounds) {
          setSearchFocusBounds(targetBounds);
          setSearchFocusKey((prev) => prev + 1);
        }
      },
      [
        adminImportedLayers,
        allMerchants,
        clearRoute,
        mapidMerchants,
      ],
    );

  const handleOpenMerchantDetail = useCallback(() => {
    setDetailOpen(true);
    setAiOpen(false);
  }, []);
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

      setSidebarMode("route");
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
        setManualRouteDestination(null);
        setRouteDestinationId(
          merchant.id,
        );
        setRouteDestinationMerchant(merchant);
        setSelectedId(
          merchant.id,
        );
        setDestinationSearch(
          merchant.name,
        );
        setDestinationSearchActive(false);
        suppressNextViewportRef.current = true;
        setSearchFocusBounds(merchantFocusBounds(merchant));
        setSearchFocusKey((key) => key + 1);
      }

      setMapPickMode("NONE");
      setPendingRouteChoice(
        null,
      );
    }, [
      pendingRouteChoice,
    ]);

  const handleLocateUser =
    useCallback((activateNearbySearch = false) => {
      if (journeyOpen) { journey.controller.focus(); return; }
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
          pendingNearbySearchRef.current = activateNearbySearch;
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

          setSearchFocusBounds({
            west: position.coords.longitude - 0.015,
            east: position.coords.longitude + 0.015,
            south: position.coords.latitude - 0.015,
            north: position.coords.latitude + 0.015,
          });
          setSearchFocusKey((prev) => prev + 1);
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
    }, [clearRoute, journeyOpen, journey.controller]);
  useEffect(() => {
    if (!userLocation || !pendingNearbySearchRef.current) return;
    pendingNearbySearchRef.current = false;
    void applyAiSearch({
      type: "APPLY_SEARCH_CRITERIA",
      criteria: {
        query,
        max_budget: maxBudget ? Number(maxBudget) : null,
        open_now: openOnly,
        max_walking_minutes: maxWalkingMinutes,
        reference_text: null,
        near_user: true,
        radius_meters: searchCriteriaRef.current?.radius_meters ?? 500,
        sort: "NEAREST",
      },
    }, false);
  }, [applyAiSearch, maxBudget, maxWalkingMinutes, openOnly, query, userLocation]);

  const routeToMerchant = useCallback((merchant: Merchant) => {
    setManualRouteDestination(null);
    setRouteDestinationId(merchant.id);
    setRouteDestinationMerchant(merchant);
    setDestinationSearch(merchant.name);
    setDestinationSearchActive(false);
    setSidebarMode("route");
    setSidebarCollapsed(false);
    setDetailOpen(false);
    setAiOpen(false);
    setSelectedId(null);
    if (userLocation) {
      setRouteOriginValue(ROUTE_ORIGIN_USER);
      setExplicitRouteOrigin(null);
    } else {
      handleLocateUser(false);
    }
  }, [handleLocateUser, userLocation]);

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
    setLocationError(null);
    setMapPickMode("ROUTE_START");
    document.querySelector(".map-panel")?.scrollIntoView({ block: "nearest" });
  }, []);

  const handleClearManualOrigin = useCallback(() => {
    setManualRouteStart(null);
    setMapPickMode("NONE");
    handleUseDatasetCenterAsOrigin();
  }, [handleUseDatasetCenterAsOrigin]);

  const selectOrigin = useCallback((coordinate: Coordinate) => {
    setManualRouteStart(coordinate);
    setRouteOriginValue(ROUTE_ORIGIN_MANUAL);
    setExplicitRouteOrigin(null);
    setOriginSearch("");
    setLocationError(null);
    setMapPickMode("NONE");
  }, []);

  const selectDestination = useCallback((coordinate: Coordinate) => {
    setManualRouteDestination({ ...coordinate });
    setManualRouteDestinationLabel("Titik tujuan di peta");
    setRouteDestinationId(null);
    setRouteDestinationMerchant(null);
    setDestinationSearch("");
    setDestinationSearchActive(false);
    setMapPickMode("NONE");
  }, []);

  const handleMapPick = useCallback((coordinate: Coordinate) => {
    if (mapPickMode === "ROUTE_START") selectOrigin(coordinate);
    if (mapPickMode === "ROUTE_DESTINATION") selectDestination(coordinate);
  }, [mapPickMode, selectOrigin, selectDestination]);

  const resetRouting = useCallback(() => {
    journey.controller.stop();
    clearRoute();
    setEditingEndpoints(false);
    setMapPickMode("NONE");
    setManualRouteStart(null);
    setManualRouteDestination(null);
    setManualRouteDestinationLabel("Titik tujuan di peta");
    setRouteOriginValue(ROUTE_ORIGIN_NONE);
    setExplicitRouteOrigin(null);
    setRouteDestinationId(null);
    setRouteDestinationMerchant(null);
    setOriginSearch("");
    setDestinationSearch("");
    setDestinationSearchActive(false);
    setRouteModeSelectionRequired(false);
  }, [clearRoute, journey.controller]);

  const applyResolvedOrigin = useCallback((place: ResolvedPlace) => {
    setManualRouteStart(null);
    setRouteOriginValue(`PLACE:${place.id}`);
    setExplicitRouteOrigin(place);
    setOriginSearch(place.label);
    setMapPickMode("NONE");
  }, []);

  const applyResolvedDestination = useCallback((place: ResolvedPlace) => {
    if (place.merchant) {
      setManualRouteDestination(null);
      setRouteDestinationId(place.merchant.id);
      setRouteDestinationMerchant(place.merchant);
      setSelectedId(place.merchant.id);
    } else {
      setManualRouteDestination(place.coordinate);
      setManualRouteDestinationLabel(place.label);
      setRouteDestinationId(null);
      setRouteDestinationMerchant(null);
    }
    setDestinationSearch(place.label);
    setDestinationSearchActive(false);
    setMapPickMode("NONE");
  }, []);

  const handleAiAction = useCallback(async (
    action: AiApplicationAction,
  ): Promise<AiActionExecutionResult> => {
    if (action.type === "APPLY_SEARCH_CRITERIA") {
      setSelectedId(null);
      setDetailOpen(false);
      setSidebarMode("search");
      setSidebarCollapsed(false);

      const message = await applyAiSearch(
        {
          type: "APPLY_SEARCH_CRITERIA",
          criteria: action.criteria,
        },
        true,
      );

      return {
        status: "COMPLETED",
        message,
      };
    }

    if (action.type === "CHANGE_ROUTE_MODE") {
      if (!routeOrigin || !routeDestination) {
        return {
          status: "REJECTED",
          message: "Pilih titik awal dan tujuan terlebih dahulu.",
        };
      }

      setActiveMode(action.mode);
      setRouteModeSelectionRequired(false);
      setEditingEndpoints(false);
      setRouteSheetOpen(true);
      setSidebarMode("route");
      setSidebarCollapsed(false);
      setDetailOpen(false);

      return { status: "ROUTE_PENDING" };
    }

    if (action.type === "FOCUS_PLACE") {
      const resolution = await resolveGetraPlace(
        action.query,
        canonical.data.transportNodes,
      );

      if (resolution.status === "AMBIGUOUS") {
        return {
          status: "REJECTED",
          message: `Lokasinya belum unik. Pilih salah satu: ${resolution.candidates.join(", ")}.`,
        };
      }

      if (resolution.status === "NOT_FOUND") {
        return {
          status: "REJECTED",
          message: `Lokasi "${action.query}" belum ditemukan.`,
        };
      }

      const place = resolution.place;

      setPrimaryMode("merchant");
      setViewMode("dataset");
      setSidebarMode("search");
      setSidebarCollapsed(false);
      setDetailOpen(false);

      if (place.merchant) {
        setSelectedId(place.merchant.id);
        suppressNextViewportRef.current = true;
        setSearchFocusBounds(merchantFocusBounds(place.merchant));
      } else {
        const padding = 0.006;
        suppressNextViewportRef.current = true;
        setSearchFocusBounds({
          west: place.coordinate.longitude - padding,
          south: place.coordinate.latitude - padding,
          east: place.coordinate.longitude + padding,
          north: place.coordinate.latitude + padding,
        });
      }

      setSearchFocusKey((key) => key + 1);

      return {
        status: "COMPLETED",
        message: `${place.label} sudah saya fokuskan di peta.`,
      };
    }

    if (action.type !== "CALCULATE_ROUTE" && action.type !== "PREPARE_ROUTE") {
      return {
        status: "REJECTED",
        message: "Saya memerlukan pilihan lokasi yang lebih spesifik.",
      };
    }

    let resolvedOrigin: ResolvedPlace;

    if (action.origin.type === "CURRENT_LOCATION") {
      if (!userLocation) {
        return {
          status: "REJECTED",
          message:
            "Aktifkan lokasi perangkat agar saya dapat memakai posisi Anda sebagai titik awal.",
        };
      }

      resolvedOrigin = {
        id: "current-location",
        label: "Lokasi saya",
        coordinate: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      };
    } else if (action.origin.type === "MAP_POINT") {
      resolvedOrigin = {
        id: "ai-map-point",
        label: "Titik pilihan",
        coordinate: {
          latitude: action.origin.latitude,
          longitude: action.origin.longitude,
        },
      };
    } else {
      const resolution = await resolveGetraPlace(
        action.origin.query,
        canonical.data.transportNodes,
      );

      if (resolution.status === "AMBIGUOUS") {
        return {
          status: "REJECTED",
          message: `Lokasi asalnya belum unik. Pilih salah satu: ${resolution.candidates.join(", ")}.`,
        };
      }

      if (resolution.status === "NOT_FOUND") {
        return {
          status: "REJECTED",
          message: `Lokasi "${action.origin.query}" belum ditemukan. Pilih titiknya di peta.`,
        };
      }

      resolvedOrigin = resolution.place;
    }

    let resolvedDestination: ResolvedPlace;
    const destination = action.destination;

    if (destination.type === "SELECTED_MERCHANT") {
      if (!selectedMerchant) {
        return {
          status: "REJECTED",
          message: "Pilih tempat tujuan pada daftar atau peta terlebih dahulu.",
        };
      }

      resolvedDestination = {
        id: selectedMerchant.id,
        label: selectedMerchant.name,
        coordinate: {
          latitude: selectedMerchant.latitude,
          longitude: selectedMerchant.longitude,
        },
        merchant: selectedMerchant,
      };
    } else if (destination.type === "MERCHANT_ID") {
      const merchantId = destination.merchant_id;
      const merchant = mapMerchants.find(
        (item) => item.id === merchantId,
      );

      if (!merchant) {
        return {
          status: "REJECTED",
          message: "Tempat tujuan tersebut belum tersedia pada konteks peta.",
        };
      }

      resolvedDestination = {
        id: merchant.id,
        label: merchant.name,
        coordinate: {
          latitude: merchant.latitude,
          longitude: merchant.longitude,
        },
        merchant,
      };
    } else {
      const destinationQuery = destination.query;
      const resolution = await resolveGetraPlace(
        destinationQuery,
        canonical.data.transportNodes,
      );

      if (resolution.status === "AMBIGUOUS") {
        return {
          status: "REJECTED",
          message: `Tujuannya belum unik. Pilih salah satu: ${resolution.candidates.join(", ")}.`,
        };
      }

      if (resolution.status === "NOT_FOUND") {
        return {
          status: "REJECTED",
          message: `Tujuan "${destinationQuery}" belum ditemukan.`,
        };
      }

      resolvedDestination = resolution.place;
    }

    applyResolvedOrigin(resolvedOrigin);
    applyResolvedDestination(resolvedDestination);

    if (action.type === "CALCULATE_ROUTE") {
      setActiveMode(action.mode);
      setRouteModeSelectionRequired(false);
    } else {
      setRouteModeSelectionRequired(true);
    }
    setEditingEndpoints(false);
    setRouteSheetOpen(true);
    setMapPickMode("NONE");
    setSidebarMode("route");
    setSidebarCollapsed(false);
    setDetailOpen(false);

    return action.type === "CALCULATE_ROUTE"
      ? { status: "ROUTE_PENDING" }
      : {
          status: "COMPLETED",
          message: "Titik awal dan tujuan siap. Pilih jalan kaki, motor, atau mobil untuk menghitung rute.",
        };
  }, [
    applyAiSearch,
    applyResolvedDestination,
    applyResolvedOrigin,
    canonical.data.transportNodes,
    mapMerchants,
    routeDestination,
    routeOrigin,
    selectedMerchant,
    userLocation,
  ]);

  return (
    <main className="workspace workspace--figma commuter-workspace">
      <GetraGlobalHeader
        utilities={<CommunityNotificationsMenu />}
      />
      <div className="workspace-context-toolbar"><StakeholderModeSwitcher /></div>

      <StakeholderContextShell hideUmkmNotice hideGeneralNotice>
        <section className={`workspace-grid ${journeyOpen ? routingStyles.activeWorkspace : ""}`} data-sidebar-collapsed={sidebarCollapsed} data-detail-open={detailOpen} data-routing-active={Boolean(route && route.distance_meters !== null && !journeyOpen)}>
          <CommuterSidebar mode={sidebarMode} onModeChange={setSidebarMode}
            onCollapse={() => setSidebarCollapsed(true)} destination={routeDestination?.name}
            route={<>
          <section className={`route-planner ${routingStyles.planner}`} aria-label="Perencana rute" data-routing-state={routingState}>
            <div className="route-planner__header">
              <div>
                <span className="eyebrow">
                  Rute perjalanan
                </span>
                <strong>
                  {journeyOpen ? `Menuju ${routeDestination?.name ?? "tujuan"}` : (routeOrigin && routeDestination && !editingEndpoints) ? "Opsi Rute" : "Mulai dari mana?"}
                </strong>
              </div>
              <Route size={18} />
            </div>

            {routeOrigin && routeDestination && !journeyOpen && !editingEndpoints ? (
              <>
                <div className="route-endpoints-summary" aria-label="Titik perjalanan terpilih">
                  <div className="route-endpoints-summary__header">
                    <span className="route-endpoints-summary__eyebrow">Perjalanan</span>
                    <div className="route-endpoints-summary__actions">
                      <button
                        type="button"
                        className="route-endpoints-summary__btn"
                        onClick={() => setEditingEndpoints(true)}
                        aria-label="Ubah titik awal atau tujuan"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="route-endpoints-summary__btn"
                        onClick={resetRouting}
                        aria-label="Reset rute"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="route-endpoints-summary__list">
                    <div className="route-endpoints-summary__item" data-testid="routing-origin">
                      <span className="route-endpoints-summary__dot route-endpoints-summary__dot--origin" aria-hidden="true" />
                      <strong>A · {routeOrigin?.label ?? "Titik mulai"}</strong>
                    </div>
                    <div className="route-endpoints-summary__item" data-testid="routing-destination">
                      <span className="route-endpoints-summary__dot route-endpoints-summary__dot--destination" aria-hidden="true" />
                      <strong>B · {routeDestination?.name ?? "Tujuan"}</strong>
                    </div>
                  </div>
                </div>

                {route && route.distance_meters !== null ? (
                  <RouteSelectionSheet
                    route={route}
                    inline
                    open={true}
                    originLabel={routeOriginPoint?.label ?? "Titik mulai"}
                    destinationLabel={routeDestinationPoint?.label ?? routeDestination?.name ?? "Tujuan"}
                    onOpenChange={setRouteSheetOpen}
                    onSelect={preview.selectCandidate}
                    onModeChange={setActiveMode}
                    preference={routePreference}
                    onPreferenceChange={setRoutePreference}
                    onStart={() => {
                      setRouteSheetOpen(false);
                      setMapPickMode("NONE");
                      void journey.controller.start();
                    }}
                  />
                ) : (
                  <p className="route-message" role="status">Menghitung rute dan pilihan alternatif...</p>
                )}
              </>
            ) : (
              <>
                {editingEndpoints && route ? (
                  <button
                    type="button"
                    className="route-secondary-button"
                    onClick={() => setEditingEndpoints(false)}
                    style={{ marginBottom: "0.75rem", width: "100%" }}
                  >
                    Batal ubah / Kembali ke rute
                  </button>
                ) : null}

                <fieldset className={routingStyles.journeyFields} disabled={journeyOpen} hidden={journeyOpen}>
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
                          ? "Mengambil lokasi..."
                          : "Aktifkan lokasi"}
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
                      aria-label="Pilih asal di peta"
                      aria-pressed={mapPickMode === "ROUTE_START"}
                      style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
                    >
                      <Target size={14} /> Pilih di peta
                    </button>
                  </div>

                  {routeOrigin ? (
                    <div className={routingStyles.point} data-testid="routing-origin">
                      <strong>A · {routeOrigin.label}</strong>
                      <span>{routeOrigin.coordinate.latitude.toFixed(6)}, {routeOrigin.coordinate.longitude.toFixed(6)}</span>
                      <div className={routingStyles.pointActions}>
                        <button type="button" onClick={handleClearManualOrigin} aria-label="Hapus asal" title="Hapus asal"><X size={16} /></button>
                      </div>
                    </div>
                  ) : null}
                  <details className="route-advanced-options">
                    <summary>Opsi lainnya</summary>
                    <CoordinateEntry label="Asal" coordinate={routeOrigin?.coordinate ?? null} onSelect={selectOrigin} />
                  </details>
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
                    Tujuan
                  </span>
                  {!routeDestination ? <>
                  <div className="route-search-box route-search-box--destination">
                    <Search size={15} />
                    <input
                      aria-label="Cari tujuan"
                      placeholder="Cari nama, brand, alamat, kecamatan..."
                      type="search"
                      value={destinationSearch}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDestinationSearch(value);
                        setDestinationSearchActive(true);
                      }}
                    />
                  </div>
                  <div className="route-search-results">
                    {destinationSearchLoading ? (
                      <p className="route-search-empty" aria-live="polite">
                        Mencari tujuan di seluruh data GETRA...
                      </p>
                    ) : destinationSearchResults.length >
                    0 ? (
                      destinationSearchResults.map(
                        (merchant) => (
                          <button
                            className="route-search-result"
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
                    ) : destinationSearchError ? (
                      <p className="route-search-empty" role="alert">
                        Pencarian tujuan sedang tidak tersedia.
                      </p>
                    ) : destinationSearchActive && destinationSearch.trim().length >= 2 ? (
                      <p className="route-search-empty">
                        Tujuan tidak ditemukan.
                      </p>
                    ) : null}
                  </div>
                <button type="button" className="route-chip-button" aria-pressed={mapPickMode === "ROUTE_DESTINATION"}
                  aria-label="Pilih tujuan di peta" onClick={() => {
                    setMapPickMode("ROUTE_DESTINATION");
                    document.querySelector(".map-panel")?.scrollIntoView({ block: "nearest" });
                  }}><Target size={14} aria-hidden="true" /> Pilih tujuan di peta</button>
                  <details className="route-advanced-options">
                    <summary>Koordinat manual</summary>
                    <CoordinateEntry label="Tujuan" coordinate={routeDestination} onSelect={selectDestination} />
                  </details>
                  </> : null}
                </div>

                {routeDestination ? (
                  <div className="route-selection-card" data-testid="routing-destination">
                    <span className="route-selection-card__label">B · Tujuan</span>
                    <strong className="route-selection-card__title">
                      <MapPinned size={14} aria-hidden="true" />
                      <span>{routeDestination.name}</span>
                    </strong>
                    <p className="route-selection-card__meta">
                      {routeDestination.district ?? routeDestination.city ?? `${routeDestination.latitude.toFixed(5)}, ${routeDestination.longitude.toFixed(5)}`}
                    </p>
                    <div className="route-selection-card__actions">
                      <button type="button" onClick={clearRouteDestination} className="route-selection-card__action">Ganti tujuan</button>
                    </div>
                  </div>
                ) : (
                  <div className="route-selection-card route-selection-card--empty">
                    <span className="route-selection-card__label">Tujuan</span>
                    <p className="route-selection-card__meta">Belum ada tujuan dipilih.</p>
                  </div>
                )}

                <div className="route-actions" style={{ marginTop: "1rem" }}>
                  <button
                    className="route-secondary-button"
                    type="button"
                    onClick={resetRouting}
                    disabled={!routeOrigin && !routeDestination && routingState === "IDLE"}
                  >
                    <RotateCcw size={14} aria-hidden="true" /> Reset
                  </button>
                </div>

                </fieldset>
                <div className="route-mode-grid" aria-label="Pilihan moda rute">
                  {routeModeSelectionRequired ? <p className="route-message" role="status">Pilih moda untuk mulai menghitung rute.</p> : null}
                  {(["walking", "motorcycle", "car"] as const).map((mode) => {
                    const Icon = mode === "walking" ? Footprints : mode === "motorcycle" ? Bike : Car;
                    return <button aria-pressed={!routeModeSelectionRequired && activeMode === mode}
                      aria-label={routeModeLabel(mode)}
                      className={!routeModeSelectionRequired && activeMode === mode ? "route-mode route-mode--active" : "route-mode"}
                      key={mode} type="button" onClick={() => { setActiveMode(mode); setRouteModeSelectionRequired(false); }}>
                      <Icon size={18} aria-hidden="true" /><span>{routeModeLabel(mode)}</span>
                    </button>;
                  })}
                </div>
              </>
            )}

            {routingState === "LOADING" && !journeyOpen ? <p className="route-message" role="status">Menghitung rute...</p> : null}

            {routingError ? (
              <p className="route-message" role="alert">
                {routingError}
              </p>
            ) : null}
            {authRequired ? <Link href="/login" className="route-primary-button">Masuk kembali</Link> : null}
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

            </>}>
          {primaryMode === "merchant" ? (
            <GlobalSearchControls
              canonicalRadius={searchIntent?.radius_meters}
              onCanonicalRadiusChange={(radius) => {
                const criteria: SearchCriteria = { query: query || searchIntent?.keyword || "", max_budget: maxBudget ? Number(maxBudget) : null, open_now: openOnly, max_walking_minutes: maxWalkingMinutes,
                  reference_text: searchCriteriaRef.current?.reference_text ?? null, near_user: !searchCriteriaRef.current?.reference_text,
                  radius_meters: radius, sort: searchIntent?.sort ?? "RELEVANCE" };
                void applyAiSearch({ type: "APPLY_SEARCH_CRITERIA", criteria }, Boolean(searchIntent?.recommendation));
              }}
              discoveryRadius={viewMode === "fair-discovery" ? discoveryRadius : undefined}
              onDiscoveryRadiusChange={setDiscoveryRadius}
              location={journeyOpen ? journeyPosition : userLocation}
              locating={locating} locationError={locationError} onLocate={() => handleLocateUser(true)}
              advanced={<>
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

              </>}
              query={query}
              suggestions={mapMerchants.slice(0, 12).map((merchant) => ({ id: merchant.id, label: merchant.name, detail: [merchant.category, merchant.district || merchant.city].filter(Boolean).join(" · ") }))}
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
              onClearQuery={() => {
                setQuery("");
                void executeCanonicalSearch({ bbox: currentViewportRef.current ?? datasetBounds,
                  queryText: "", regionIds: selectedRegionIds,
                  activate: Boolean(selectedRegionIds.length || maxBudget || openOnly || maxWalkingMinutes), focus: false });
              }}
              onQueryChange={(value) => { searchRevisionRef.current++; canonicalRequestRef.current?.abort(); setQuery(value); }}
              onSubmit={submitGlobalSearch}
              onClear={clearGlobalSearch}
              onToggleRegion={toggleSearchRegion}
              onSearchThisArea={searchCurrentArea}
              onMaxBudgetChange={(value) => { searchRevisionRef.current++; canonicalRequestRef.current?.abort(); serviceAreaRequestRef.current?.abort(); setMaxBudget(value); }}
              onOpenNowChange={(value) => { searchRevisionRef.current++; canonicalRequestRef.current?.abort(); serviceAreaRequestRef.current?.abort(); setOpenOnly(value); }}
              onMaxWalkingMinutesChange={(value) => { searchRevisionRef.current++; canonicalRequestRef.current?.abort(); serviceAreaRequestRef.current?.abort(); setMaxWalkingMinutes(value); }}
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
                  <span>Catatan pada area peta ini belum memengaruhi perhitungan rute.</span>
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
              {accessibilityLoading ? <p className="route-message" role="status">Memuat catatan aksesibilitas di area peta saat ini...</p> : null}
              {accessibilityError ? <p className="route-message route-message--error" role="alert">{accessibilityError}</p> : null}
              {accessibilityNeed ? (
                <div className="accessibility-summary" data-accessibility-sample-size={accessibilityNeed.sample_size}>
                  <span><strong>{accessibilityNeed.observation_count}</strong> observasi</span>
                  <span><strong>{accessibilityNeed.confirmed_count}</strong> terkonfirmasi</span>
                  <span><strong>{accessibilityNeed.needs_review_count}</strong> perlu verifikasi</span>
                  <span><strong>{accessibilityNeed.recent_count}</strong> terbaru</span>
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
            <p className="route-message" role="status">Jangkauan jalan kaki belum tersedia dari titik awal ini.</p>
          ) : null}

          {primaryMode === "merchant" && placeSearchStatus ? (
            <p className="route-message" role="status">{placeSearchStatus}</p>
          ) : null}

          {primaryMode === "merchant" && searchActive && searchTotal === 0 ? (
            <section className="commuter-no-results" aria-live="polite">
              <strong>Belum ada tempat yang sesuai dengan semua filter.</strong>
              <span>GETRA tidak mengubah filter Anda secara otomatis. Ubah anggaran, status buka, atau batas waktu berjalan untuk memperluas hasil.</span>
              <div>
                {maxBudget ? <button type="button" onClick={() => setMaxBudget("")}>Hapus batas anggaran</button> : null}
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

          <div className="section-divider" />

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
                  <span className="eyebrow">Catatan Aksesibilitas</span>
                  <strong>{accessibilityEvidence.length} catatan di area peta</strong>
                </div>
                <span className="source-stamp">CATATAN</span>
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
              <p className="commuter-mode-note">{userLocation ? "Penelusuran Adil memakai radius dari lokasi saya. Anggaran dan pilihan wilayah hanya berlaku pada pencarian biasa." : "Aktifkan lokasi saya untuk menggunakan Penelusuran Adil."}</p>
              <FairDiscoveryResults
                result={fairDiscoveryResult}
                isLoading={fairDiscoveryLoading}
                error={fairDiscoveryError}
                selectedId={selectedId}
                onSelectMerchant={(merchant) => handleSelect(discoveryMerchant(merchant))}
                onSelectSponsored={(placement) => handleSelect(discoveryMerchant(placement))}
                onRequestRoute={(merchant) => routeToMerchant(discoveryMerchant(merchant))}
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
          ) : !searchActive && !mapidLoading && !mapidError ? (
            <div className="commuter-idle" role="status">
              <strong>Belum ada pencarian aktif.</strong>
              <p>Cari tempat, pilih wilayah, gunakan lokasi Anda, atau Tanya GETRA untuk memulai.</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <div>
                  <span className="eyebrow">{resultPresentation.title}</span>
                  <strong>{mapidLoading ? "Mencari tempat…" : resultPresentation.count}</strong>
                  <small>{searchIntent?.candidate_limited ? "Kandidat terbatas. Persempit area pencarian." : "Berdasarkan data tempat yang tersedia"}</small>
                  <label className="commuter-sort">Urutkan <select aria-label="Urutan hasil" value={searchIntent?.sort ?? "RELEVANCE"} onChange={(event) => {
                    const criteria: SearchCriteria = { query: query || searchIntent?.keyword || "", max_budget: maxBudget ? Number(maxBudget) : null, open_now: openOnly, max_walking_minutes: maxWalkingMinutes,
                      reference_text: searchCriteriaRef.current?.reference_text ?? null, near_user: searchCriteriaRef.current?.near_user ?? false,
                      radius_meters: searchCriteriaRef.current?.radius_meters ?? null, sort: event.target.value as SearchCriteria["sort"] };
                    void applyAiSearch({ type: "APPLY_SEARCH_CRITERIA", criteria }, Boolean(searchIntent?.recommendation));
                  }}><option value="RELEVANCE">{searchIntent?.recommendation ? "Paling sesuai" : "Relevansi"}</option><option value="NEAREST" disabled={!userLocation && !searchIntent?.reference}>Terdekat</option><option value="PRICE_ASC">Harga terendah</option></select></label>
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

              {eligibleSponsoredMerchants.length > 0 ? <section className="commuter-sponsored" aria-label="Promosi yang sesuai pencarian">
                <div className="commuter-sponsored__heading"><strong>Promosi</strong><small>Memenuhi filter pencarian</small></div>
                {eligibleSponsoredMerchants.map((merchant) => <MerchantResultRow
                  key={`sponsored-${merchant.id}`}
                  merchant={merchant}
                  budget={searchIntent?.constraints.budget?.max_idr}
                  sponsored
                  selected={merchant.id === selectedMerchant?.id}
                  onSelect={handleSelect}
                />)}
              </section> : null}

              <div className="result-list" aria-busy={mapidLoading}>
                {mapidLoading ? <div className="commuter-loading" role="status"><span /><span /><span /><small>Memuat tempat…</small></div> : mapidError ? <p className="empty-state">Tempat belum dapat dimuat. Coba lagi.</p> : merchants.length === 0 ? (
                  <div className="empty-state" role="status">
                    {searchIntent?.keyword
                      ? `"${searchIntent.keyword}" tidak ditemukan di ${searchIntent.location_text ?? "area ini"}.`
                      : "Belum ada tempat yang tercatat di area ini."}
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
                          budget={searchIntent?.constraints.budget?.max_idr}
                          selected={merchant.id === selectedMerchant?.id}
                          onSelect={handleSelect}
                        />
                      ))}
                    </section>
                  ))
                ) : (
                  merchants.map((merchant) => (
                    <MerchantResultRow
                      key={merchant.id}
                      merchant={merchant}
                      budget={searchIntent?.constraints.budget?.max_idr}
                      selected={merchant.id === selectedMerchant?.id}
                      onSelect={handleSelect}
                    />
                  ))
                )}
              </div>
            </>
          )}

          <details className="commuter-tools"><summary>Eksplorasi & data peta</summary>
            {activeExperience === "UMKM" ? <Link href="/umkm/advertising">Kelola Promosi</Link> : null}
          <section className="dataset-switcher">
            <div>
              <span className="eyebrow">
                Data peta
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
                Area peta
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
                Memuat data MAPID...
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

          <div className="primary-map-mode" aria-label="Mode peta utama">
            <button
              type="button"
              className={primaryMode === "merchant" ? "primary-map-mode__button primary-map-mode__button--active" : "primary-map-mode__button"}
              aria-pressed={primaryMode === "merchant"}
              onClick={activateMerchantMode}
            >
              Tempat
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

          {/* View Mode Switcher */}
          {primaryMode === "merchant" ? <div className="workspace-view-switcher" aria-label="Mode tampilan hasil usaha">
            <button
              type="button"
              onClick={() => setViewMode("fair-discovery")}
              className={`workspace-view-switcher__button workspace-view-switcher__button--fair ${
                viewMode === "fair-discovery"
                  ? "workspace-view-switcher__button--active"
                  : ""
              }`}
            >
              ✨ Penelusuran Adil
            </button>
            <button
              type="button"
              onClick={() => setViewMode("dataset")}
              className={`workspace-view-switcher__button workspace-view-switcher__button--dataset ${
                viewMode === "dataset"
                  ? "workspace-view-switcher__button--active"
                  : ""
              }`}
            >
              📁 Daftar Data
            </button>
            <button
              type="button"
              onClick={() => setViewMode("analytics")}
              className={`workspace-view-switcher__button workspace-view-switcher__button--analytics ${
                viewMode === "analytics"
                  ? "workspace-view-switcher__button--active"
                  : ""
              }`}
            >
              <BarChart3 size={13} aria-hidden="true" /> Analisis
            </button>
          </div> : null}

          <div className="ai-teaser">
            <Bot size={17} />
            <div>
              <strong>
                Data map siap difilter
              </strong>
              <span>
                {datasetId ===
                "all-areas"
                  ? "Semua lapisan aktif ditampilkan bersama. Gunakan filter area untuk fokus pada data tertentu, Jakarta Pusat, atau Jakarta Barat."
                  : isAdminImportDataset(
                      datasetId,
                    )
                    ? `${
                        activeAdminImportedLayer
                          ?.layer_name ??
                        adminImportedLayer
                          ?.layer_name ??
                        "Data hasil import"
                      } sudah tersedia untuk pencarian dan rute.`
                    : datasetId ===
                      "mapid-food-jakarta-pusat"
                    ? "Data MAPID sudah tersedia untuk dicari, dipilih, dan digunakan sebagai tujuan rute."
                    : "Aktifkan lokasi perangkat agar daftar diurutkan dari titik kamu saat ini."}
              </span>
            </div>
          </div>

          </details>
        </CommuterSidebar>

        <section
          className={`map-panel ${route && !journeyOpen ? routingStyles.planningMap : ""}`}
          aria-label="Peta GETRA"
          style={{ position: "relative" }}
        >
          <div className="commuter-map-actions">
             {sidebarCollapsed ? <button type="button" onClick={() => setSidebarCollapsed(false)}><Search size={16} />Cari / Rute</button> : null}
             <button className="commuter-ai-launcher" type="button" aria-expanded={aiOpen} aria-controls="commuter-assistant" onClick={() => { setAiOpen(!aiOpen); setDetailOpen(false); if (!aiOpen && window.innerWidth <= 760) setSidebarCollapsed(true); }}><Bot size={16} />Tanya GETRA</button>
           </div>
          <div
            id="commuter-assistant"
            className="commuter-assistant"
            hidden={!aiOpen}
            onKeyDown={(event) => {
              if (event.key === "Escape") setAiOpen(false);
            }}
          >
            <AiPanel
              activeExperience={activeExperience}
              currentOrigin={
                routeOrigin?.coordinate ??
                (userLocation
                  ? {
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }
                  : undefined)
              }
              currentDestination={
                selectedMerchant
                  ? {
                      latitude: selectedMerchant.latitude,
                      longitude: selectedMerchant.longitude,
                    }
                  : routeDestination
                    ? {
                        latitude: routeDestination.latitude,
                        longitude: routeDestination.longitude,
                      }
                    : undefined
              }
              selectedEntityId={selectedMerchant?.id}
              selectedEntityName={selectedMerchant?.name}
              activeRoute={
                route &&
                typeof route.distance_meters === "number" &&
                typeof route.duration_seconds === "number"
                  ? {
                      mode: route.mode,
                      distance_meters: route.distance_meters,
                      duration_seconds: route.duration_seconds,
                    }
                  : undefined
              }
              onMinimize={() => setAiOpen(false)}
              onClose={() => setAiOpen(false)}
              getSearchRevision={() => searchRevisionRef.current}
              searchContext={
                searchActive
                  ? {
                      query: query || searchIntent?.keyword || "",
                      max_budget: maxBudget ? Number(maxBudget) : null,
                      open_now: openOnly,
                      max_walking_minutes: maxWalkingMinutes,
                      reference_text:
                        aiSearchCriteria?.reference_text ??
                        (searchIntent?.reference?.type === "TRANSIT"
                          ? searchIntent.reference.label
                          : null),
                      near_user:
                        aiSearchCriteria?.near_user ??
                        searchIntent?.reference?.type === "USER_LOCATION",
                      radius_meters:
                        aiSearchCriteria?.radius_meters ??
                        searchIntent?.radius_meters ??
                        null,
                      sort:
                        aiSearchCriteria?.sort ??
                        searchIntent?.sort ??
                        "RELEVANCE",
                    }
                  : undefined
              }
              onSearchAction={applyAiSearch}
              onAction={handleAiAction}
            />
          </div>

          {mapPickMode !== "NONE" && (
            <div className={routingStyles.pickBanner} role="status">
              <strong>{mapPickMode === "ROUTE_START" ? "Memilih asal (A)" : "Memilih tujuan (B)"}</strong>
              <button type="button" onClick={() => setMapPickMode("NONE")} aria-label="Batal memilih titik" title="Batal memilih titik"><X size={18} /></button>
            </div>
          )}
          {journeyOpen ? <JourneyControls
            journey={journey}
            canStart={false}
            onStart={() => undefined}
            destinationName={routeDestination?.name}
            mode={activeMode}
            onModeChange={setActiveMode}
          /> : null}
          {route && route.distance_meters !== null && !journeyOpen ? (
            <div className={routingStyles.mobileSheetOnly}>
              <RouteSelectionSheet route={route} open={routeSheetOpen}
                originLabel={routeOriginPoint?.label ?? "Titik mulai"}
                destinationLabel={routeDestinationPoint?.label ?? routeDestination?.name ?? "Tujuan"}
                onOpenChange={setRouteSheetOpen} onSelect={preview.selectCandidate}
                onModeChange={setActiveMode}
                preference={routePreference} onPreferenceChange={setRoutePreference}
                onStart={() => { setRouteSheetOpen(false); setMapPickMode("NONE"); void journey.controller.start(); }} />
            </div>
          ) : null}
          <GetraMap
            transportNodes={canonical.data.transportNodes}
            datasetKey={datasetId}
            focusBounds={searchFocusBounds}
            focusKey={searchFocusKey}
            merchants={primaryMode === "merchant" ? mapMerchants : []}
            selectedId={primaryMode === "merchant" ? selectedId : null}
            propertyCandidates={primaryMode === "business-space" ? propertyCandidates : []}
            selectedPropertyId={primaryMode === "business-space" ? selectedPropertyId : null}
            accessibilityEvidence={primaryMode === "accessibility" ? accessibilityEvidence : []}
            selectedAccessibilityEvidenceId={primaryMode === "accessibility" ? selectedAccessibilityEvidenceId : null}
            userLocation={journeyOpen ? journeyPosition : userLocation}
            journeyActive={journey.engaged}
            journeyFollowing={journey.following}
            journeyFocusKey={journey.focusKey}
            onJourneyCameraOverride={journey.controller.suspendFollow}
            onSelect={handleSelect}
            onRequestMerchantRoute={routeToMerchant}
            onMerchantDetail={handleOpenMerchantDetail}
            onSelectProperty={loadSelectedPropertyDetail}
            onSelectAccessibilityEvidence={loadSelectedAccessibilityEvidenceDetail}
            onClearSelection={handleClearSelection}
            onViewportChange={handleViewportChange}
            contextualLayerData={contextualLayerData}
            contextualLayerVisibility={contextualLayerVisibility}
            onContextualLayerChange={handleContextualLayerChange}
            datasetBounds={datasetBounds}
            datasetOrigin={datasetOrigin}
            routeOriginPoint={journeyOpen ? null : routeOriginPoint}
            routeDestinationPoint={routeDestinationPoint}
            routeGeometry={route?.geometry}
            routeCandidates={journeyOpen ? [] : route?.route_candidates ?? []}
            selectedRouteId={route?.selected_route_id ?? null}
            onSelectRoute={(routeId) => {
              const candidate = route?.route_candidates?.find((item) => item.route_id === routeId);
              if (candidate && !journeyOpen) preview.selectCandidate(candidate);
            }}
            serviceAreaGeometry={serviceArea?.geometry ?? null}
            importBoundaries={
              visibleImportBoundaries
            }
            administrativeBoundaries={visibleAdministrativeBoundaries}
            sponsoredPlacements={viewMode === "fair-discovery" ? fairDiscoveryResult?.sponsored : eligibleSponsoredPlacements}
            onSelectSponsored={(placement) => {
              const merchant = merchants.find((item) => item.id === placement.merchant_id);
              handleSelect(merchant ?? discoveryMerchant(placement));
            }}
            analyticsCollection={analyticsCollection}
            analyticsMode={analyticsMode}
            onSelectAnalyticsRegion={setSelectedAnalyticsRegionId}
            mapPickMode={mapPickMode}
            onMapPick={handleMapPick}
          />
        </section>

        <aside className="right-panel panel" hidden={!detailOpen} tabIndex={0} aria-label="Detail lokasi terpilih">
          <button className="commuter-detail-close" type="button" onClick={() => setDetailOpen(false)}>Tutup detail <X size={16} /></button>
          {primaryMode !== "merchant" ? <>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                Detail
              </span>
              <h2>
                Detail lokasi
              </h2>
            </div>
            <Database size={20} />
          </div>

          <section className="canonical-card" aria-label="Area dan transportasi">
            <div className="canonical-card__header">
              <div>
                <span className="eyebrow">Data GETRA</span>
                <strong>Area & Transportasi</strong>
              </div>
              <button type="button" onClick={canonical.reload} disabled={canonical.loading}>
                {canonical.loading ? "Memuat..." : "Perbarui"}
              </button>
            </div>
            {canonical.error ? (
              <p className="canonical-state canonical-state--error" role="alert">{canonical.error}</p>
            ) : canonical.loading ? (
              <p className="canonical-state" role="status">Memuat area dan transportasi GETRA...</p>
            ) : (
              <dl className="canonical-grid">
                <div><dt>Area dimuat</dt><dd>{canonical.data.studyAreas.length}</dd></div>
                <div><dt>Titik dimuat</dt><dd>{canonical.data.transportNodes.length}</dd></div>
                <div><dt>Koridor dimuat</dt><dd>{canonical.data.transportCorridors.length}</dd></div>
              </dl>
            )}
            {!canonical.loading && !canonical.error && canonical.data.studyAreas.length === 0
              && canonical.data.transportNodes.length === 0 && canonical.data.transportCorridors.length === 0 ? (
                <p className="canonical-state">Belum ada area atau transportasi yang tersedia.</p>
              ) : null}
          </section>
          </> : null}

          {primaryMode === "merchant" && selectedMerchant ? (
            <PlaceDetailDrawer merchant={selectedMerchant} onRoute={routeToMerchant} />
          ) : primaryMode === "business-space" ? (
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
                      : "Data GETRA"}
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
                    setManualRouteDestination(null);
                    setRouteDestinationId(selectedMerchant.id);
                    setRouteDestinationMerchant(selectedMerchant);
                    setDestinationSearch(selectedMerchant.name);
                    setDestinationSearchActive(false);
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
                  <Route size={16} /> {routeDestination?.id === selectedMerchant.id ? "Sudah menjadi tujuan" : routeOrigin ? "Lihat pilihan rute" : "Jadikan tujuan rute"}
                </button>
              </div>

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
                    "Alamat belum tersedia pada data peta ini."}
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

export default GetraDashboard;
