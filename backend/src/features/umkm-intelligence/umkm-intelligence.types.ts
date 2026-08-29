import type { MultiPolygon } from "geojson";
import type { AnalyticsRawCounts, EvidenceConfidence } from "@/src/features/demand-intelligence";

export type ReadinessComponentStatus = "AVAILABLE" | "MISSING" | "LIMITED" | "PASS" | "UNAVAILABLE";

export interface ReadinessComponent {
  id: string;
  label: string;
  status: ReadinessComponentStatus;
  points: number;
  max_points: number;
  evidence: string;
}

export interface ReadinessDiagnostic {
  score: number;
  status: "INCOMPLETE" | "DEVELOPING" | "READY";
  model_version: string;
  components: ReadinessComponent[];
}

export interface IntelligenceRecommendation {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  reason: string;
  action: string;
}

export interface MerchantIntelligenceResult {
  merchant: {
    id: string;
    name: string;
    category: string;
    category_slug: string | null;
    address: string | null;
    longitude: number;
    latitude: number;
    is_mobile: boolean;
    publish_status: string;
    verification_status: string;
    source_evidence: string[];
    source_freshness: "FRESH" | "STALE" | "UNKNOWN";
    updated_at: string;
  };
  data_readiness: ReadinessDiagnostic;
  visibility: ReadinessDiagnostic;
  location_readiness: ReadinessDiagnostic;
  market_context: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA" | "UNAVAILABLE";
    area: { id: string; name: string; type: "ADMINISTRATIVE_CITY"; geometry: MultiPolygon } | null;
    category_slug: string | null;
    window: { start_at: string; end_at: string } | null;
    demand_score: number | null;
    supply_score: number | null;
    retail_gap: number | null;
    raw_counts: AnalyticsRawCounts | null;
    confidence: EvidenceConfidence | "UNAVAILABLE";
    demand_model_version: "GETRA_DEMAND_V1" | null;
    retail_gap_model_version: "GETRA_RETAIL_GAP_V1" | null;
    claim_scope: "GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL" | null;
  };
  location_context: {
    network_status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | "UNAVAILABLE";
    nearest_transit: {
      id: string;
      name: string;
      transport_mode: string;
      longitude: number;
      latitude: number;
      network_distance_meters: number;
      network_walking_seconds: number;
    } | null;
    analysis_method: "PGROUTING_NETWORK";
  };
  nearby_similar_merchants: Array<{
    id: string;
    name: string;
    category: string;
    longitude: number;
    latitude: number;
  }>;
  recommendations: IntelligenceRecommendation[];
  model_versions: {
    data_readiness: string;
    visibility: string;
    location_readiness: string;
    demand: "GETRA_DEMAND_V1";
    retail_gap: "GETRA_RETAIL_GAP_V1";
    recommendations: string;
  };
  limitations: string[];
}

export interface MerchantEvidenceInput {
  name: boolean;
  category: boolean;
  location: boolean;
  address: boolean;
  openingHours: boolean;
  price: boolean;
  photo: boolean;
  menu: boolean;
  phone: boolean;
  verified: boolean;
  published: boolean;
  isMobile: boolean;
  regionKnown: boolean;
  networkStatus: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | "UNAVAILABLE";
  transitRoutable: boolean;
}

export interface UmkmCopilotResult {
  status: "AI" | "DETERMINISTIC_FALLBACK" | "SAFETY_FALLBACK";
  answer: string;
  evidence: {
    merchant_id: string;
    data_readiness: number;
    visibility: number;
    location_readiness: number;
    demand_score: number | null;
    supply_score: number | null;
    retail_gap: number | null;
    confidence: string;
    recommendation_ids: string[];
  };
  limitations: string[];
}
