import type { FeatureCollection, MultiPolygon } from "geojson";

export type AnalyticsMode = "DEMAND" | "RETAIL_GAP";
export type AnalyticsCategorySlug =
  | "bakso" | "nasi-goreng" | "coffee" | "restaurant" | "warung"
  | "street-food" | "fast-food" | "food" | "beverage" | "minimarket"
  | "retail" | "pharmacy" | "health" | "laundry" | "services";
export type AnalyticsConfidence =
  | "INSUFFICIENT_DATA" | "LIMITED_EVIDENCE" | "MODERATE_EVIDENCE" | "STRONGER_EVIDENCE";

export interface AnalyticsQuery {
  mode: AnalyticsMode;
  category: AnalyticsCategorySlug;
  days: 7 | 30;
  region_ids: string[];
  bbox: { west: number; south: number; east: number; north: number } | null;
}

export interface AnalyticsRow {
  spatial_unit: { id: string; name: string; type: "ADMINISTRATIVE_CITY"; geometry: MultiPolygon };
  category: { slug: AnalyticsCategorySlug };
  raw_counts: {
    search_events: number;
    route_requests: number;
    commuter_requests: number;
    transaction_observations: number;
    campaign_interactions: number;
    canonical_merchants: number;
  };
  weighted_demand: number;
  demand_score: number;
  supply_score: number;
  retail_gap: number | null;
  evidence: {
    sample_size: number;
    source_diversity: number;
    source_types: string[];
    latest_signal_at: string | null;
    coverage_status: "PILOT_OBSERVED_DATA";
    confidence: AnalyticsConfidence;
  };
}

export interface DemandIntelligenceResult {
  mode: AnalyticsMode;
  demand_model_version: "GETRA_DEMAND_V1";
  retail_gap_model_version: "GETRA_RETAIL_GAP_V1";
  spatial_unit_type: "ADMINISTRATIVE_CITY";
  category: { id: string; slug: AnalyticsCategorySlug; name: string };
  window: { start_at: string; end_at: string };
  weights: Record<string, number>;
  normalization: string;
  claim_scope: "GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL";
  rows: AnalyticsRow[];
  limitations: string[];
}

export interface AnalyticsMapProperties {
  region_id: string;
  region_name: string;
  category_name: string;
  demand_score: number;
  supply_score: number;
  retail_gap: number | null;
  sample_size: number;
  confidence: AnalyticsConfidence;
  selected: boolean;
}

export type AnalyticsMapCollection = FeatureCollection<MultiPolygon, AnalyticsMapProperties>;

export interface AnalyticsInterpretation {
  status: "AI" | "DETERMINISTIC_FALLBACK";
  answer: string;
  evidence: {
    region_id: string;
    category: string;
    demand_score: number;
    supply_score: number;
    retail_gap: number | null;
    sample_size: number;
    confidence: AnalyticsConfidence;
    window: { start_at: string; end_at: string };
  };
  limitations: string[];
}
