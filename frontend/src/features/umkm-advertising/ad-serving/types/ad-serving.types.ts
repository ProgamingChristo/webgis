import { CampaignLifecycleStatus } from "../../lifecycle/types/lifecycle.types";

export type PlacementType = "SPONSORED_PIN";

export type AdServingCtaType = "VIEW_PROFILE" | "REQUEST_ROUTE";

export interface SponsoredPinServingContext {
  longitude: number;
  latitude: number;
}

export interface SponsoredPinDTO {
  placement_type: PlacementType;
  sponsored: true;
  label: "Sponsored";
  campaign_id: string;
  creative_id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_category: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  headline: string;
  description: string | null;
  cta_type: AdServingCtaType;
  image_url?: string | null;
}

export type ServingBlockerCode =
  | "CAMPAIGN_NOT_ACTIVE"
  | "MERCHANT_NOT_ELIGIBLE"
  | "MERCHANT_GEOMETRY_INVALID"
  | "CREATIVE_NOT_FOUND"
  | "CREATIVE_NOT_READY"
  | "WRONG_CREATIVE_TYPE"
  | "TARGET_NOT_CONFIGURED"
  | "TARGET_INVALID"
  | "OUTSIDE_TARGET";

export interface ServingChecklist {
  lifecycle: boolean;
  merchant: boolean;
  creative: boolean;
  targeting: boolean;
}

export interface ServingPreviewResult {
  campaignId: string;
  merchantId: string;
  effectiveStatus: CampaignLifecycleStatus;
  servable: boolean;
  checks: ServingChecklist;
  blockers: ServingBlockerCode[];
  placement: SponsoredPinDTO | null;
  evaluatedContext: SponsoredPinServingContext;
}
