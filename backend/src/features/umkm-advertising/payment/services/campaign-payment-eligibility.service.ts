import { SupabaseClient } from "@supabase/supabase-js";
import { PaymentRepository } from "../repositories/payment.repository";
import { AdPaymentOrderRecord } from "../types/payment.types";

export class CampaignPaymentEligibilityService {
  private repo: PaymentRepository;

  constructor(private readonly supabase: SupabaseClient<any>) {
    this.repo = new PaymentRepository(supabase);
  }

  async evaluatePaymentReadiness(campaignId: string): Promise<{
    is_ready: boolean;
    reason?: string;
    payment_order: AdPaymentOrderRecord | null;
  }> {
    const latest = await this.repo.getLatestPaymentOrderByCampaignId(campaignId);

    if (!latest) {
      return {
        is_ready: false,
        reason: "Belum ada transaksi pembayaran untuk campaign ini.",
        payment_order: null,
      };
    }

    if (latest.status === "PAID") {
      return {
        is_ready: true,
        payment_order: latest,
      };
    }

    return {
      is_ready: false,
      reason: `Status pembayaran saat ini: ${latest.status} (membutuhkan status PAID).`,
      payment_order: latest,
    };
  }
}
