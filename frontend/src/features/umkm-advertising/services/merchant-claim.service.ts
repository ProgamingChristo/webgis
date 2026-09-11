import { apiClient } from "@/src/lib/api-client";

export type PromotionRelationshipState =
  | "VERIFIED_OWNER"
  | "SUBMISSION_PENDING"
  | "CLAIM_PENDING";

export interface OwnedMerchantSummary {
  id: string;
  name: string;
  address: string | null;
  publish_status: string;
  verification_status: string;
  isOwnedByMe?: boolean;
  relationshipState?: PromotionRelationshipState;
  statusLabel?: string;
  canCreateCampaign?: boolean;
  reason?: string | null;
  detailMessage?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface MyMerchantsResponse {
  ownedMerchants: OwnedMerchantSummary[];
  recommendedMerchants: OwnedMerchantSummary[];
  ineligibleMerchants?: OwnedMerchantSummary[];
  allBusinesses?: OwnedMerchantSummary[];
}

export class MerchantClaimService {
  static async getMyMerchants(): Promise<MyMerchantsResponse> {
    return apiClient.get<MyMerchantsResponse>("/api/umkm/advertising/my-merchants");
  }
}

