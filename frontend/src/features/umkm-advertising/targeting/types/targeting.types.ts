import type * as GeoJSON from "geojson";

export type TargetType = "RADIUS" | "STUDY_AREA";

export type TargetingReadiness = "CONFIGURED" | "NOT_CONFIGURED" | "INVALID";

export type GeoJSONGeometry = GeoJSON.Geometry;

export type GeoJSONFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  Record<string, unknown>
>;

export interface StudyAreaSummary {
  id: string;
  name: string;
  description: string | null;
  geometry?: GeoJSON.Geometry;
}

export interface CampaignTarget {
  id: string | null;
  campaignId: string;
  status: TargetingReadiness;
  targetType: TargetType | null;
  radiusMeters: number | null;
  studyAreaId: string | null;
  studyArea: StudyAreaSummary | null;
  merchantLocation: {
    longitude: number;
    latitude: number;
  } | null;
  previewGeoJSON: GeoJSONFeature | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SaveRadiusTargetingInput {
  target_type: "RADIUS";
  radius_meters: number;
}

export interface SaveStudyAreaTargetingInput {
  target_type: "STUDY_AREA";
  study_area_id: string;
}

export type SaveTargetingInput =
  | SaveRadiusTargetingInput
  | SaveStudyAreaTargetingInput;
