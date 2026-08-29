import type { MapidMissionPoint } from "@/src/integrations/mapid/mission.types";

export const CONTEXTUAL_SOURCES = [
  "PROPERTI_GO",
  "STRUK_GO",
  "ACTIVITIES",
] as const;

export type ContextualSource = (typeof CONTEXTUAL_SOURCES)[number];

export type ActivityCategory =
  | "TRANSIT_OBSERVATION"
  | "ACCESSIBILITY_OBSERVATION"
  | "PEDESTRIAN_OBSERVATION"
  | "ECONOMIC_UMKM_OBSERVATION"
  | "AREA_OBSERVATION"
  | "UNCLASSIFIED";

export interface ContextualObservationProperties {
  activity_category?: ActivityCategory;
  address?: string | null;
  banner_photo_url?: string | null;
  description?: string | null;
  facade_photo_url?: string | null;
  freshness_status: string;
  media_urls?: string[];
  observed_at: string | null;
  payment_method?: string | null;
  place_category?: string | null;
  place_name?: string | null;
  property_category?: string | null;
  property_transaction_type?: string | null;
  provenance: {
    imported_at: string | null;
    provider: "MAPID";
    source_type: ContextualSource;
  };
  receipt_photo_url?: string | null;
  semantics:
    | "PROPERTY_OBSERVATION"
    | "TRANSACTION_OBSERVATION"
    | "FIELD_OBSERVATION";
  source_id: string;
  source_type: ContextualSource;
  title?: string | null;
  verification_status: string;
}

export interface ContextualObservationFeature {
  type: "Feature";
  id: string;
  geometry: MapidMissionPoint;
  properties: ContextualObservationProperties;
}

export interface ContextualObservationCollection {
  type: "FeatureCollection";
  features: ContextualObservationFeature[];
}

export interface ContextualObservationResult {
  bbox: { west: number; south: number; east: number; north: number };
  feature_collection: ContextualObservationCollection;
  has_more: boolean;
  limit: number;
  next_offset: number | null;
  offset: number;
  source: ContextualSource;
  total_available: number;
  total_features: number;
}
