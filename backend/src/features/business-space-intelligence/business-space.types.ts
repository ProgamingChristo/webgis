import type { AnalyticsCategorySlug, AnalyticsRow, DemandIntelligenceResult } from "@/src/features/demand-intelligence";

export type PropertyFreshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN";
export type BusinessSpaceAvailability = "AVAILABILITY_UNCONFIRMED" | "NEEDS_RECONFIRMATION" | "UNKNOWN_FRESHNESS";
export type BusinessSpaceMetricStatus = "AVAILABLE" | "INSUFFICIENT_DATA" | "UNAVAILABLE";

export interface BusinessSpacePoint {
  longitude: number;
  latitude: number;
}

export interface BusinessSpacePropertyCandidate extends BusinessSpacePoint {
  id: string;
  source_id: string;
  property_category: string | null;
  property_transaction_type: string | null;
  address: string | null;
  facade_photo_url: string | null;
  banner_photo_url: string | null;
  observed_at: string | null;
  imported_at: string | null;
  freshness: PropertyFreshness;
  availability: BusinessSpaceAvailability;
  provenance: {
    provider: "MAPID";
    source_type: "PROPERTI_GO";
    source_id: string;
    imported_at: string | null;
  };
}

export interface BusinessSpaceAdministrativeContext {
  region_id: string | null;
  region_name: string | null;
  region_type: "ADMINISTRATIVE_CITY" | "UNKNOWN";
}

export interface BusinessSpaceTransitContext {
  status: BusinessSpaceMetricStatus;
  nearest: {
    id: string;
    name: string;
    transport_mode: string | null;
    network_distance_meters: number;
    network_walking_minutes: number;
  } | null;
}

export interface BusinessSpaceWalkingContext {
  status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | "UNAVAILABLE";
  catchment_minutes: number;
  service_area_type: "NETWORK_SERVICE_AREA";
  service_area: Record<string, unknown> | null;
}

export interface BusinessSpaceMarketContext {
  status: BusinessSpaceMetricStatus;
  category_slug: AnalyticsCategorySlug;
  window: DemandIntelligenceResult["window"] | null;
  demand_score: number | null;
  supply_score: number | null;
  retail_gap: number | null;
  confidence: AnalyticsRow["evidence"]["confidence"] | "UNAVAILABLE";
  sample_size: number | null;
  demand_model_version: DemandIntelligenceResult["demand_model_version"] | null;
  retail_gap_model_version: DemandIntelligenceResult["retail_gap_model_version"] | null;
  claim_scope: DemandIntelligenceResult["claim_scope"] | null;
}

export interface BusinessSpaceSupplyContext {
  status: BusinessSpaceMetricStatus;
  category_slug: AnalyticsCategorySlug;
  spatial_context: "ADMINISTRATIVE_CITY";
  comparable_merchant_count: number | null;
  comparable_merchants: Array<{
    id: string;
    name: string;
    category: string | null;
    longitude: number;
    latitude: number;
  }>;
  dedupe_basis: "canonical_merchants";
}

export interface BusinessSpaceIndicator {
  id: string;
  label: string;
  status: "POSITIVE" | "WATCH" | "UNKNOWN";
  value: string;
}

export interface BusinessSpaceCandidateDetail {
  candidate: BusinessSpacePropertyCandidate;
  administrative_context: BusinessSpaceAdministrativeContext;
  transit_context: BusinessSpaceTransitContext;
  walking_context: BusinessSpaceWalkingContext;
  market_context: BusinessSpaceMarketContext;
  supply_context: BusinessSpaceSupplyContext;
  indicators: BusinessSpaceIndicator[];
  model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1";
  limitations: readonly string[];
}

export interface BusinessSpaceComparison {
  category_slug: AnalyticsCategorySlug;
  days: 7 | 30;
  catchment_minutes: number;
  model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1";
  candidates: BusinessSpaceCandidateDetail[];
  metric_rows: Array<{
    metric: string;
    values: Array<{ candidate_id: string; value: string; status: BusinessSpaceMetricStatus | "AVAILABLE" }>;
  }>;
  trade_off_summary: string;
  limitations: readonly string[];
}

export interface BusinessSpaceInsight {
  status: "AI" | "DETERMINISTIC_FALLBACK" | "SAFETY_FALLBACK";
  answer: string;
  evidence: {
    candidate_ids: string[];
    category_slug: AnalyticsCategorySlug;
    days: 7 | 30;
    model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1";
  };
  limitations: readonly string[];
}
