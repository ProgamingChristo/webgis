import type { ANALYTICS_CATEGORY_SLUGS } from "./analytics.constants";
import type { MultiPolygon } from "geojson";

export type AnalyticsCategorySlug = typeof ANALYTICS_CATEGORY_SLUGS[number];
export type AnalyticsMode = "DEMAND" | "RETAIL_GAP";
export type EvidenceConfidence =
  | "INSUFFICIENT_DATA"
  | "LIMITED_EVIDENCE"
  | "MODERATE_EVIDENCE"
  | "STRONGER_EVIDENCE";

export interface AnalyticsBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface AnalyticsQuery {
  category: AnalyticsCategorySlug;
  start_at: string;
  end_at: string;
  region_ids: string[];
  bbox: AnalyticsBounds | null;
  limit: number;
}

export interface AnalyticsRawCounts {
  search_events: number;
  route_requests: number;
  commuter_requests: number;
  transaction_observations: number;
  campaign_interactions: number;
  canonical_merchants: number;
}

export interface AnalyticsRow {
  spatial_unit: {
    id: string;
    name: string;
    type: "ADMINISTRATIVE_CITY";
    geometry: MultiPolygon;
  };
  category: { slug: AnalyticsCategorySlug };
  raw_counts: AnalyticsRawCounts;
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
    confidence: EvidenceConfidence;
  };
}

export interface DemandIntelligenceResult {
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
    confidence: EvidenceConfidence;
    window: { start_at: string; end_at: string };
  };
  limitations: string[];
}
