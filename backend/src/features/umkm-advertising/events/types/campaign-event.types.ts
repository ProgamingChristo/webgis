import { PlacementType } from "../../ad-serving/types/ad-serving.types";

export type CampaignEventType =
  | "IMPRESSION"
  | "SPONSORED_PIN_CLICK"
  | "PROFILE_OPEN"
  | "ROUTE_REQUEST";

export type { PlacementType };

export interface RecordCampaignEventInput {
  event_type: CampaignEventType;
  campaign_id: string;
  creative_id?: string | null;
  placement: PlacementType;
  session_key: string;
  dedup_key?: string;
  context?: {
    surface?: string;
    request_id?: string;
    referrer?: string;
    source?: string;
    [key: string]: any;
  };
}

export interface CampaignEventRecord {
  id: string;
  campaign_id: string;
  merchant_id: string;
  creative_id: string | null;
  event_type: CampaignEventType;
  placement: PlacementType;
  session_key: string;
  dedup_key: string;
  context: Record<string, any>;
  occurred_at: string;
  created_at: string;
}

export interface RecordEventResult {
  accepted: boolean;
  deduplicated: boolean;
  event_id?: string;
}
