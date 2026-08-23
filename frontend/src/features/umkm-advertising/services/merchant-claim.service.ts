import { apiClient } from "@/src/lib/api-client";

export interface OwnedMerchantSummary {
  id: string;
  name: string;
  address: string | null;
  publish_status: string;
  verification_status: string;
  isOwnedByMe?: boolean;
}

export interface MyMerchantsResponse {
  ownedMerchants: OwnedMerchantSummary[];
  recommendedMerchants: OwnedMerchantSummary[];
}

export class MerchantClaimService {
  static async getMyMerchants(): Promise<MyMerchantsResponse> {
    return apiClient.get<MyMerchantsResponse>("/api/umkm/advertising/my-merchants");
  }

  static async claimMerchant(merchantId: string): Promise<{ isOwned: boolean; merchantId: string }> {
    return apiClient.post<{ isOwned: boolean; merchantId: string }>(
      `/api/merchants/${merchantId}/ownership`,
      {}
    );
  }
}
