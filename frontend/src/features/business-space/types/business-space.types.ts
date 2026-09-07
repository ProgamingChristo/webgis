export type PropertyFreshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN";
export type BusinessSpaceAvailability = "AVAILABILITY_UNCONFIRMED" | "NEEDS_RECONFIRMATION" | "UNKNOWN_FRESHNESS";
export type BusinessSpaceMetricStatus = "AVAILABLE" | "INSUFFICIENT_DATA" | "UNAVAILABLE";
export type BusinessCategorySlug = "bakso" | "nasi-goreng" | "coffee" | "restaurant" | "warung" | "street-food" | "fast-food" | "food" | "beverage" | "minimarket" | "retail" | "pharmacy" | "health" | "laundry" | "services";

export interface BusinessSpaceViewport {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface BusinessSpaceCandidate {
  id: string;
  source_id: string;
  longitude: number;
  latitude: number;
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

export interface BusinessSpaceCandidateList {
  category_slug: BusinessCategorySlug;
  days: 7 | 30;
  candidates: BusinessSpaceCandidate[];
  total_available: number;
  total_is_exact?: boolean;
  search_truncated?: boolean;
  limit: number;
  offset: number;
  has_more: boolean;
  limitations: string[];
}

export interface BusinessSpaceCandidateDetail {
  candidate: BusinessSpaceCandidate;
  administrative_context: {
    region_id: string | null;
    region_name: string | null;
    region_type: "ADMINISTRATIVE_CITY" | "UNKNOWN";
  };
  transit_context: {
    status: BusinessSpaceMetricStatus;
    nearest: {
      id: string;
      name: string;
      transport_mode: string | null;
      network_distance_meters: number;
      network_walking_minutes: number;
    } | null;
  };
  walking_context: {
    status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | "UNAVAILABLE";
    catchment_minutes: number;
    service_area_type: "NETWORK_SERVICE_AREA";
    service_area: Record<string, unknown> | null;
  };
  market_context: {
    status: BusinessSpaceMetricStatus;
    category_slug: BusinessCategorySlug;
    window: { start_at: string; end_at: string } | null;
    demand_score: number | null;
    supply_score: number | null;
    retail_gap: number | null;
    confidence: string;
    sample_size: number | null;
    demand_model_version: "GETRA_DEMAND_V1" | null;
    retail_gap_model_version: "GETRA_RETAIL_GAP_V1" | null;
    claim_scope: string | null;
  };
  supply_context: {
    status: BusinessSpaceMetricStatus;
    category_slug: BusinessCategorySlug;
    spatial_context: "ADMINISTRATIVE_CITY";
    comparable_merchant_count: number | null;
    comparable_merchants: Array<{ id: string; name: string; category: string | null; longitude: number; latitude: number }>;
    dedupe_basis: "canonical_merchants";
  };
  indicators: Array<{ id: string; label: string; status: "POSITIVE" | "WATCH" | "UNKNOWN"; value: string }>;
  model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1";
  limitations: string[];
}

export interface BusinessSpaceComparison {
  category_slug: BusinessCategorySlug;
  days: 7 | 30;
  catchment_minutes: number;
  model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1";
  candidates: BusinessSpaceCandidateDetail[];
  metric_rows: Array<{ metric: string; values: Array<{ candidate_id: string; value: string; status: string }> }>;
  trade_off_summary: string;
  limitations: string[];
}

export interface BusinessSpaceInsight {
  status: "AI" | "DETERMINISTIC_FALLBACK" | "SAFETY_FALLBACK";
  answer: string;
  evidence: {
    candidate_ids: string[];
    category_slug: BusinessCategorySlug;
    days: 7 | 30;
    model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1";
  };
  limitations: string[];
}
