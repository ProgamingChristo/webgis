import { CampaignLifecycleStatus } from "../types/lifecycle.types";

export const CAMPAIGN_LIFECYCLE_STATUSES: readonly CampaignLifecycleStatus[] = [
  "DRAFT",
  "READY",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "ENDED",
  "CANCELLED",
] as const;

export const TERMINAL_STATUSES: readonly CampaignLifecycleStatus[] = [
  "ENDED",
  "CANCELLED",
] as const;

export const PAUSABLE_STATUSES: readonly CampaignLifecycleStatus[] = [
  "SCHEDULED",
  "ACTIVE",
] as const;

export const EDITABLE_SCHEDULE_STATUSES: readonly CampaignLifecycleStatus[] = [
  "DRAFT",
  "READY",
  "SCHEDULED",
  "PAUSED",
] as const;
