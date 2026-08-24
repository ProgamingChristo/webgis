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

export interface UmkmWorkspaceSummary {
  verified_merchants_count: number;
  pending_submissions_count: number;
  active_campaigns_count: number;
  owned_merchants: OwnedMerchantBrief[];
  recent_submissions: SubmissionBrief[];
}
