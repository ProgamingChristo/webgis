export type CampaignLifecycleStatus =
  | "DRAFT"
  | "READY"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "CANCELLED";

export type CampaignReadinessBlocker =
  | "MERCHANT_NOT_ELIGIBLE"
  | "CREATIVE_NOT_READY"
  | "TARGETING_NOT_CONFIGURED"
  | "SCHEDULE_NOT_CONFIGURED"
  | "SCHEDULE_INVALID"
  | "CAMPAIGN_TERMINAL";

export interface CampaignReadinessChecks {
  merchant: boolean;
  creative: boolean;
  targeting: boolean;
  schedule: boolean;
}

export interface CampaignReadinessResult {
  ready: boolean;
  checks: CampaignReadinessChecks;
  blockers: CampaignReadinessBlocker[];
}

export interface CampaignAllowedActions {
  canEditSchedule: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
}

export interface CampaignLifecycleDTO {
  campaignId: string;
  merchantId: string;
  name: string;
  status: CampaignLifecycleStatus;
  effectiveStatus: CampaignLifecycleStatus;
  startAt: string | null;
  endAt: string | null;
  readiness: CampaignReadinessResult;
  allowedActions: CampaignAllowedActions;
}

export interface UpdateScheduleInput {
  start_at: string;
  end_at: string;
}
