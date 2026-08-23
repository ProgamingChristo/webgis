import { TargetType, TargetingReadiness, GeoJSONFeature } from "../types/targeting.types";

export interface StudyAreaSummaryDTO {
  id: string;
  name: string;
  description: string | null;
}

export interface CampaignTargetDTO {
  id: string | null;
  campaignId: string;
  status: TargetingReadiness;
  targetType: TargetType | null;
  radiusMeters: number | null;
  studyAreaId: string | null;
  studyArea: StudyAreaSummaryDTO | null;
  merchantLocation: {
    longitude: number;
    latitude: number;
  } | null;
  previewGeoJSON: GeoJSONFeature | null;
  createdAt: string | null;
  updatedAt: string | null;
}
