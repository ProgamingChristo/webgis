import { apiClient } from "@/src/lib/api-client";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission";

export interface AdminMerchantClaimRecord {
  id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_category: string;
  merchant_address: string | null;
  merchant_publish_status: string | null;
  merchant_verification_status: string | null;
  has_ownership_conflict: boolean;
  submitted_by: string;
  submitted_by_name: string;
  submitted_by_username: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  evidence: {
    contact_name: string | null;
    contact_phone: string | null;
    relationship: string | null;
    statement: string | null;
  };
  created_at: string;
  reviewed_at: string | null;
}

export const adminUmkmReviewService = {
  listMerchantSubmissions(): Promise<MerchantSubmissionRecord[]> {
    return apiClient.get<MerchantSubmissionRecord[]>(
      "/api/admin/merchant-submissions?limit=50&offset=0",
    );
  },

  approveMerchantSubmission(id: string): Promise<unknown> {
    return apiClient.post(
      `/api/admin/merchant-submissions/${id}/approve`,
      {},
    );
  },

  rejectMerchantSubmission(id: string, note: string): Promise<unknown> {
    return apiClient.post(
      `/api/admin/merchant-submissions/${id}/reject`,
      { note },
    );
  },

  listMerchantClaims(): Promise<AdminMerchantClaimRecord[]> {
    return apiClient.get<AdminMerchantClaimRecord[]>(
      "/api/admin/merchant-claims?limit=50&offset=0",
    );
  },

  approveMerchantClaim(id: string): Promise<AdminMerchantClaimRecord> {
    return apiClient.post<AdminMerchantClaimRecord>(
      `/api/admin/merchant-claims/${id}/approve`,
      {},
    );
  },

  rejectMerchantClaim(id: string, note: string): Promise<AdminMerchantClaimRecord> {
    return apiClient.post<AdminMerchantClaimRecord>(
      `/api/admin/merchant-claims/${id}/reject`,
      { note },
    );
  },
};
