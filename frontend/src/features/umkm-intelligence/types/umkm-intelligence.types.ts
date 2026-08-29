import type { MultiPolygon } from "geojson";

export type EvidenceConfidence = "INSUFFICIENT_DATA" | "LIMITED_EVIDENCE" | "MODERATE_EVIDENCE" | "STRONGER_EVIDENCE" | "UNAVAILABLE";

export interface ReadinessComponent {
  id: string;
  label: string;
  status: "AVAILABLE" | "MISSING" | "LIMITED" | "PASS" | "UNAVAILABLE";
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

export interface UmkmIntelligenceResult {
  merchant: {
    id: string; name: string; category: string; category_slug: string | null;
    address: string | null; longitude: number; latitude: number; is_mobile: boolean;
    publish_status: string; verification_status: string; source_evidence: string[];
    source_freshness: "FRESH" | "STALE" | "UNKNOWN"; updated_at: string;
  };
  data_readiness: ReadinessDiagnostic;
  visibility: ReadinessDiagnostic;
  location_readiness: ReadinessDiagnostic;
  market_context: {
    status: "AVAILABLE" | "INSUFFICIENT_DATA" | "UNAVAILABLE";
    area: { id: string; name: string; type: "ADMINISTRATIVE_CITY"; geometry: MultiPolygon } | null;
    category_slug: string | null;
    window: { start_at: string; end_at: string } | null;
    demand_score: number | null; supply_score: number | null; retail_gap: number | null;
    raw_counts: { search_events: number; route_requests: number; commuter_requests: number; transaction_observations: number; campaign_interactions: number; canonical_merchants: number } | null;
    confidence: EvidenceConfidence;
    demand_model_version: "GETRA_DEMAND_V1" | null;
    retail_gap_model_version: "GETRA_RETAIL_GAP_V1" | null;
    claim_scope: "GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL" | null;
  };
  location_context: {
    network_status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | "UNAVAILABLE";
    nearest_transit: { id: string; name: string; transport_mode: string; longitude: number; latitude: number; network_distance_meters: number; network_walking_seconds: number } | null;
    analysis_method: "PGROUTING_NETWORK";
  };
  nearby_similar_merchants: Array<{ id: string; name: string; category: string; longitude: number; latitude: number }>;
  recommendations: Array<{ id: string; priority: "HIGH" | "MEDIUM" | "LOW"; title: string; reason: string; action: string }>;
  model_versions: Record<string, string>;
  limitations: string[];
}

export interface UmkmCopilotResult {
  status: "AI" | "DETERMINISTIC_FALLBACK" | "SAFETY_FALLBACK";
  answer: string;
  evidence: {
    merchant_id: string; data_readiness: number; visibility: number; location_readiness: number;
    demand_score: number | null; supply_score: number | null; retail_gap: number | null;
    confidence: string; recommendation_ids: string[];
  };
  limitations: string[];
}
