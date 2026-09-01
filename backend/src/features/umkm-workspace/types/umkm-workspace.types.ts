export interface OwnedMerchantBrief {
  id: string;
  name: string;
  address: string | null;
  category: string;
  publish_status: string;
  verification_status: string;
  campaigns_count: number;
}

export interface SubmissionBrief {
  id: string;
  name: string;
  category: string;
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantClaimBrief {
  id: string;
  merchant_id: string;
  merchant_name: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  address: string | null;
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface UmkmWorkspaceSummary {
  verified_merchants_count: number;
  pending_submissions_count: number;
  active_campaigns_count: number;
  owned_merchants: OwnedMerchantBrief[];
  recent_submissions: SubmissionBrief[];
  recent_claims: MerchantClaimBrief[];
}

export type ArchiveOwnedMerchantStatus =
  | "ARCHIVED"
  | "ALREADY_ARCHIVED"
  | "ACTIVE_CAMPAIGNS"
  | "FORBIDDEN"
  | "NOT_FOUND";

export interface ArchiveOwnedMerchantResult {
  merchant_id: string;
  status: ArchiveOwnedMerchantStatus;
  blocking_campaigns_count: number;
}
