import { apiClient } from "@/src/lib/api-client";
import { MerchantSubmissionService } from "@/src/features/merchant-submission/services/merchant-submission.service";
import type {
  AuthoritativeMerchantProfile,
  UpdateMerchantProfilePayload,
} from "../types/merchant-profile.types";

export class OwnerMerchantProfileService {
  static async getProfile(
    merchantId: string,
    signal?: AbortSignal
  ): Promise<AuthoritativeMerchantProfile> {
    return apiClient.get<AuthoritativeMerchantProfile>(
      `/api/merchants/${encodeURIComponent(merchantId)}/profile`,
      { signal, cache: "no-store" }
    );
  }

  static async updateProfile(
    merchantId: string,
    payload: UpdateMerchantProfilePayload
  ): Promise<AuthoritativeMerchantProfile> {
    return apiClient.patch<AuthoritativeMerchantProfile>(
      `/api/merchants/${encodeURIComponent(merchantId)}/profile`,
      payload
    );
  }

  static async uploadPhoto(file: File): Promise<{ image_url: string; path: string }> {
    return MerchantSubmissionService.uploadPhoto(file);
  }
}
