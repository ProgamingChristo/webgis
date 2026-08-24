export type BannerPlacementType = "CONTEXTUAL_BANNER";

export interface ContextualBannerServingContext {
  longitude: number;
  latitude: number;
  radiusMeters?: number;
  category?: string;
  query?: string;
  openNow?: boolean;
  maxWalkingMinutes?: number;
}

export interface ContextualBannerDTO {
  placement_type: BannerPlacementType;
  sponsored: true;
  label: "Sponsored";
  campaign_id: string;
  creative_id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_category: string;
  headline: string;
  description: string | null;
  image_url?: string | null;
  cta_type: "VIEW_PROFILE" | "REQUEST_ROUTE";
}
