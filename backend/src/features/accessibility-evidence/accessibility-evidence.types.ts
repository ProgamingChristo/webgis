export const ACCESSIBILITY_EVIDENCE_SOURCES = [
  "MAPID_ACTIVITY",
  "GETRA_COMMUNITY",
] as const;

export const ACCESSIBILITY_EVIDENCE_CATEGORIES = [
  "TRANSIT_OBSERVATION",
  "ACCESSIBILITY_OBSERVATION",
  "PEDESTRIAN_OBSERVATION",
  "ECONOMIC_UMKM_OBSERVATION",
  "AREA_OBSERVATION",
  "UNCLASSIFIED",
] as const;

export const ACCESSIBILITY_EVIDENCE_SUBCATEGORIES = [
  "SIDEWALK",
  "CROSSING",
  "GUIDING_BLOCK",
  "WHEELCHAIR_ACCESS",
  "OBSTRUCTION",
  "SURFACE_CONDITION",
  "TRANSIT_ACCESS",
  "OTHER_ACCESSIBILITY",
] as const;

export const ACCESSIBILITY_VALIDATION_STATUSES = [
  "OBSERVED",
  "NEEDS_REVIEW",
  "REVIEWED",
  "CONFIRMED",
  "REJECTED",
  "STALE",
] as const;

export const ACCESSIBILITY_FRESHNESS_STATUSES = [
  "RECENT",
  "AGING",
  "STALE",
  "UNKNOWN",
] as const;

export const ACCESSIBILITY_RELATION_STATUSES = [
  "CANDIDATE",
  "CONFIRMED_RELATION",
  "REJECTED_RELATION",
] as const;

export type AccessibilityEvidenceSource =
  (typeof ACCESSIBILITY_EVIDENCE_SOURCES)[number];
export type AccessibilityEvidenceCategory =
  (typeof ACCESSIBILITY_EVIDENCE_CATEGORIES)[number];
export type AccessibilityEvidenceSubcategory =
  (typeof ACCESSIBILITY_EVIDENCE_SUBCATEGORIES)[number];
export type AccessibilityValidationStatus =
  (typeof ACCESSIBILITY_VALIDATION_STATUSES)[number];
export type AccessibilityFreshnessStatus =
  (typeof ACCESSIBILITY_FRESHNESS_STATUSES)[number];
export type AccessibilityRelationStatus =
  (typeof ACCESSIBILITY_RELATION_STATUSES)[number];

export interface AccessibilityEvidencePoint {
  type: "Point";
  coordinates: [number, number];
}

export interface AccessibilitySpatialRelation {
  network_feature_type: "PEDESTRIAN_EDGE";
  network_feature_id: string;
  distance_m: number;
  relation_status: AccessibilityRelationStatus;
  routing_effect_enabled: false;
}

export interface AccessibilityEvidenceDTO {
  id: string;
  source_type: AccessibilityEvidenceSource;
  source_record_id: string;
  geometry: AccessibilityEvidencePoint;
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

export interface AccessibilityEvidenceDetailDTO extends AccessibilityEvidenceDTO {
  spatial_relation: AccessibilitySpatialRelation | null;
}

export interface AccessibilityEvidenceResult {
  bbox: { west: number; south: number; east: number; north: number };
  evidence: AccessibilityEvidenceDTO[];
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
