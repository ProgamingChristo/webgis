import type { SearchBounds, SearchRegion } from "@/src/features/global-search/global-search.types";

export interface CommuterConstraints {
  budget: { max_idr: number } | null;
  opening: { open_now: true; timezone: "Asia/Jakarta" } | null;
  walking: { max_minutes: number } | null;
}

export interface CommuterOrigin {
  longitude: number;
  latitude: number;
  source: "USER_LOCATION" | "SELECTED_POINT" | "EXPLICIT_ORIGIN";
}

export interface StructuredCommuterIntent {
  domain: "MERCHANT";
  original_query: string;
  keyword: string | null;
  location_text: string | null;
  scope: {
    type: "GLOBAL" | "CURRENT_VIEWPORT" | "REGION" | "MULTI_REGION";
    region_ids: string[];
    bounds: SearchBounds;
  };
  category: string | null;
  constraints: CommuterConstraints;
  origin: CommuterOrigin | null;
  parser: "DETERMINISTIC";
  confidence: "HIGH" | "MEDIUM";
}

export interface WalkingCandidateInput {
  candidate_id: string;
  longitude: number;
  latitude: number;
}

export interface WalkingCandidateEvidence {
  candidate_id: string;
  status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS";
  network_distance_meters: number | null;
  access_distance_meters: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  destination_node_id: number | null;
}

export interface CommuterSearchMetadata {
  candidate_count: number;
  constrained_count: number;
  excluded: {
    budget: number;
    unknown_price: number;
    closed: number;
    unknown_hours: number;
    walking_time: number;
    unroutable: number;
  };
  hard_constraints_applied: string[];
  constraints_relaxed: false;
  regions: SearchRegion[];
}
