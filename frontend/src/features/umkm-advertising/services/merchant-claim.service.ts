import { apiClient } from "@/src/lib/api-client";

export interface OwnedMerchantSummary {
  id: string;
  name: string;
  address: string | null;
  publish_status: string;
  verification_status: string;
  isOwnedByMe?: boolean;
  reason?: string | null;
}

export interface MyMerchantsResponse {
  ownedMerchants: OwnedMerchantSummary[];
  recommendedMerchants: OwnedMerchantSummary[];
  ineligibleMerchants?: OwnedMerchantSummary[];
}

export class MerchantClaimService {
  static async getMyMerchants(): Promise<MyMerchantsResponse> {
    return apiClient.get<MyMerchantsResponse>("/api/umkm/advertising/my-merchants");
  }
}
