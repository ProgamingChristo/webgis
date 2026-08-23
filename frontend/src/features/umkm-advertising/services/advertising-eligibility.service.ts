import { apiClient } from "@/src/lib/api-client";
import { AdvertisingEligibilityResult } from "../types/advertising-eligibility.types";

export class AdvertisingEligibilityService {
  static async checkEligibility(
    merchantId: string
  ): Promise<AdvertisingEligibilityResult> {
    return apiClient.get<AdvertisingEligibilityResult>(
      `/api/umkm/advertising/eligibility?merchantId=${merchantId}`
    );
  }
}
