import { CampaignTargetDTO } from "../dto/targeting.dto";
import { GeoJSONFeature, TargetType } from "../types/targeting.types";

export function mapTargetRowToDTO(params: {
  row: any | null;
  campaignId: string;
  merchantLocation: { longitude: number; latitude: number } | null;
  studyArea: { id: string; name: string; description: string | null } | null;
  previewGeoJSON: GeoJSONFeature | null;
}): CampaignTargetDTO {
  const { row, campaignId, merchantLocation, studyArea, previewGeoJSON } = params;

  if (!row) {
    return {
      id: null,
      campaignId,
      status: "NOT_CONFIGURED",
      targetType: null,
      radiusMeters: null,
      studyAreaId: null,
      studyArea: null,
      merchantLocation,
      previewGeoJSON: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: "CONFIGURED",
    targetType: row.target_type as TargetType,
    radiusMeters: row.radius_meters,
    studyAreaId: row.study_area_id,
    studyArea,
    merchantLocation,
    previewGeoJSON,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
