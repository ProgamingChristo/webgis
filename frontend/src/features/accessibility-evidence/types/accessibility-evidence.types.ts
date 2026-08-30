import type { MapViewportBounds } from "@/src/services/mapid-layer.service";

export type AccessibilityEvidenceSource =
  | "MAPID_ACTIVITY"
  | "GETRA_COMMUNITY";

export type AccessibilityEvidenceCategory =
  | "TRANSIT_OBSERVATION"
  | "ACCESSIBILITY_OBSERVATION"
  | "PEDESTRIAN_OBSERVATION"
  | "ECONOMIC_UMKM_OBSERVATION"
  | "AREA_OBSERVATION"
  | "UNCLASSIFIED";

export type AccessibilityEvidenceSubcategory =
  | "SIDEWALK"
  | "CROSSING"
  | "GUIDING_BLOCK"
  | "WHEELCHAIR_ACCESS"
  | "OBSTRUCTION"
  | "SURFACE_CONDITION"
  | "TRANSIT_ACCESS"
  | "OTHER_ACCESSIBILITY";

export type AccessibilityValidationStatus =
  | "OBSERVED"
  | "NEEDS_REVIEW"
  | "REVIEWED"
  | "CONFIRMED"
  | "REJECTED"
  | "STALE";

export type AccessibilityFreshnessStatus =
  | "RECENT"
  | "AGING"
  | "STALE"
  | "UNKNOWN";

export type AccessibilityRelationStatus =
  | "CANDIDATE"
  | "CONFIRMED_RELATION"
  | "REJECTED_RELATION";

export interface AccessibilityEvidence {
  id: string;
  source_type: AccessibilityEvidenceSource;
  source_record_id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  category: AccessibilityEvidenceCategory;
  suggested_category: AccessibilityEvidenceCategory;
  subcategory: AccessibilityEvidenceSubcategory;
  title: string | null;
  description: string | null;
  media_urls: string[];
  observed_at: string | null;
  freshness_status: AccessibilityFreshnessStatus;
  validation_status: AccessibilityValidationStatus;
  relation_status: AccessibilityRelationStatus;
  routing_effect_enabled: false;
}

export interface AccessibilitySpatialRelation {
  network_feature_type: "PEDESTRIAN_EDGE";
  network_feature_id: string;
  distance_m: number;
  relation_status: AccessibilityRelationStatus;
  routing_effect_enabled: false;
}

export interface AccessibilityEvidenceDetail extends AccessibilityEvidence {
  spatial_relation: AccessibilitySpatialRelation | null;
}

export interface AccessibilityEvidenceResult {
  bbox: MapViewportBounds;
  evidence: AccessibilityEvidence[];
  has_more: boolean;
  limit: number;
  next_offset: number | null;
  offset: number;
  total_available: number;
}

export interface AccessibilityNeedSummary {
  aggregation_unit: "VIEWPORT";
  sample_size: number;
  observation_count: number;
  confirmed_count: number;
  needs_review_count: number;
  observed_count: number;
  recent_count: number;
  low_sample: boolean;
  category_breakdown: Record<string, number>;
  validation_breakdown: Record<string, number>;
  freshness_breakdown: Record<string, number>;
  model: {
    name: "ACCESSIBILITY_EVIDENCE_COUNTS_V1";
    score: null;
    limitations: string[];
  };
}

export interface AccessibilityEvidenceQuery {
  bbox: MapViewportBounds;
  source_type?: AccessibilityEvidenceSource;
  category?: AccessibilityEvidenceCategory;
  validation_status?: AccessibilityValidationStatus;
  days?: number;
  limit?: number;
  offset?: number;
}
