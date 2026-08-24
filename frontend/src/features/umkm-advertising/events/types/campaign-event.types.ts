export type CampaignEventType =
  | "IMPRESSION"
  | "SPONSORED_PIN_CLICK"
  | "PROFILE_OPEN"
  | "ROUTE_REQUEST";

export type PlacementType =
  | "SPONSORED_PIN"
  | "CONTEXTUAL_BANNER"
  | "PROFILE_POSTER";

export interface RecordCampaignEventInput {
  event_type: CampaignEventType;
  campaign_id: string;
  creative_id?: string | null;
  placement: PlacementType;
  session_key?: string;
  dedup_key?: string;
  context?: {
    surface?: string;
    request_id?: string;
    referrer?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface RecordEventResult {
  accepted: boolean;
  deduplicated: boolean;
  event_id?: string;
}
