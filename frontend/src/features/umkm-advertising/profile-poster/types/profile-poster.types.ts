export type ProfilePosterPlacementType = "PROFILE_POSTER";

export interface ProfilePosterDTO {
  placement_type: ProfilePosterPlacementType;
  sponsored: true;
  label: "Sponsored";
  campaign_id: string;
  creative_id: string;
  merchant_id: string;
  merchant_name: string;
  headline: string;
  description: string | null;
  image_url?: string | null;
  cta_type: "VIEW_PROFILE" | "REQUEST_ROUTE";
  campaign_end_at?: string | null;
}
