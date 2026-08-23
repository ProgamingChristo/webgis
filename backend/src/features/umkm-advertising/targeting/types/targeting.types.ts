export type TargetType = "RADIUS" | "STUDY_AREA";

export type TargetingReadiness = "CONFIGURED" | "NOT_CONFIGURED" | "INVALID";

export interface GeoJSONGeometry {
  type: string;
  coordinates: any;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: Record<string, any>;
}

export interface CampaignTarget {
  id: string;
  campaignId: string;
  targetType: TargetType;
  radiusMeters: number | null;
  studyAreaId: string | null;
  centerGeometry: GeoJSONGeometry | null;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantTargetCenter {
  merchantId: string;
  name: string;
  longitude: number;
  latitude: number;
}
