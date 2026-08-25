import { apiClient } from "@/src/lib/api-client";
import { CreateCheckoutDTO, PaymentStatusDTO } from "../types/payment.types";

export class PaymentService {
  static async getPaymentStatus(campaignId: string): Promise<PaymentStatusDTO> {
    return apiClient.get<PaymentStatusDTO>(
      `/api/umkm/advertising/campaigns/${encodeURIComponent(campaignId)}/payment`
    );
  }

  static async createCheckout(
    campaignId: string,
    packageId?: string
  ): Promise<CreateCheckoutDTO> {
    return apiClient.post<CreateCheckoutDTO>(
      `/api/umkm/advertising/campaigns/${encodeURIComponent(campaignId)}/payment/checkout`,
      packageId ? { package_id: packageId } : {}
    );
  }

  static async refreshPaymentStatus(campaignId: string): Promise<PaymentStatusDTO> {
    return apiClient.post<PaymentStatusDTO>(
      `/api/umkm/advertising/campaigns/${encodeURIComponent(campaignId)}/payment/refresh`,
      {}
    );
  }
}
