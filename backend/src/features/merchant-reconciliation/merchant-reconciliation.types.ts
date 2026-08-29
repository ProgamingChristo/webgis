export const MERCHANT_RECONCILIATION_ALGORITHM_VERSION =
  "merchant-reconciliation-v1";

export const MERCHANT_RECONCILIATION_STATUSES = [
  "MATCH_CONFIRMED",
  "MATCH_HIGH_CONFIDENCE",
  "MATCH_REVIEW_REQUIRED",
  "NO_MATCH",
] as const;

export type MerchantReconciliationStatus =
  (typeof MERCHANT_RECONCILIATION_STATUSES)[number];

export interface MerchantCandidateInput {
  menuObservationId: string;
  menuSourceRecordId: string;
  menuName: string | null;
  menuCategory: string | null;
  menuMobility: string | null;
  menuProperties: Record<string, unknown>;
  menuObservedAt: string | null;
  menuLongitude: number;
  menuLatitude: number;
  premiumMerchantId: string | null;
  premiumSourceRecordId: string | null;
  premiumName: string | null;
  premiumAddress: string | null;
  premiumPhone: string | null;
  premiumCategory: string | null;
  premiumMetadata: Record<string, unknown>;
  premiumLongitude: number | null;
  premiumLatitude: number | null;
  distanceMeters: number | null;
}

export interface MerchantMatchDecision {
  status: MerchantReconciliationStatus;
  score: number;
  nameScore: number;
  phoneMatch: boolean | null;
  addressMatch: boolean | null;
  categoryMatch: boolean | null;
  isMobile: boolean;
  reason: string;
  candidate: MerchantCandidateInput;
}

export interface MerchantReconciliationReport {
  algorithm_version: string;
  started_at: string;
  finished_at: string;
  premium_input: number;
  menu_go_input: number;
  confirmed: number;
  high_confidence: number;
  review_required: number;
  no_match: number;
  canonical_merchants_created: number;
  canonical_merchants_reused: number;
  source_links_upserted: number;
}

