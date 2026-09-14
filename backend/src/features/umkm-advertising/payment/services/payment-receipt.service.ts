import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { PaymentRepository } from "../repositories/payment.repository";
import { GetraPaymentReceiptDTO } from "../types/payment-receipt.types";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";

export class PaymentReceiptService {
  private repo: PaymentRepository;
  private eligibilityService: AdvertisingEligibilityService;

  constructor(private readonly supabase: SupabaseClient<any>) {
    this.repo = new PaymentRepository(supabase);
    this.eligibilityService = new AdvertisingEligibilityService(
      supabase,
      new MerchantOwnershipService(supabase)
    );
  }

  async getReceipt(
    campaignId: string,
    userId: string
  ): Promise<GetraPaymentReceiptDTO> {
    // 1. Fetch Campaign
    const { data: campaign, error: cError } = await this.supabase
      .from("ad_campaigns")
      .select("id, name, merchant_id")
      .eq("id", campaignId)
      .single();

    if (cError || !campaign) {
      throw new ApplicationError("NOT_FOUND", "Campaign tidak ditemukan.");
    }

    // 2. Authorization & IDOR Protection: Must be merchant owner or ADMIN
    const { data: profile } = await this.supabase
      .from("profiles")
      .select("account_role")
      .eq("id", userId)
      .single();

    const isAdmin = profile?.account_role === "ADMIN";

    if (!isAdmin) {
      const { data: merchant } = await this.supabase
        .from("merchants")
        .select("owner_id")
        .eq("id", campaign.merchant_id)
        .single();

      if (!merchant || merchant.owner_id !== userId) {
        throw new ApplicationError(
          "FORBIDDEN",
          "Akses ditolak: Anda tidak memiliki wewenang untuk mengakses bukti pembayaran campaign ini."
        );
      }
    }

    // 3. Fetch Latest Payment Order
    const paymentOrder = await this.repo.getLatestPaymentOrderByCampaignId(campaignId);

    if (!paymentOrder) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Belum ada catatan transaksi pembayaran untuk campaign ini."
      );
    }

    if (paymentOrder.status !== "PAID") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Bukti pembayaran belum tersedia karena status transaksi belum lunas (PAID)."
      );
    }

    // 4. Fetch Merchant Details
    const { data: merchant } = await this.supabase
      .from("merchants")
      .select("name")
      .eq("id", campaign.merchant_id)
      .single();

    const merchantName = merchant?.name || "Merchant GETRA";

    // 5. Fetch User Email (Safe payer identifier)
    const { data: payerUser } = await this.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", paymentOrder.created_by)
      .single();

    const orderSuffix = paymentOrder.order_id.replace(/^GETRA-AD-/, "");
    const invoiceNumber = `INV-SB-${orderSuffix}`;

    return {
      invoice_number: invoiceNumber,
      order_id: paymentOrder.order_id,
      transaction_id: paymentOrder.provider_transaction_id || `tx-sb-${orderSuffix}`,
      merchant_id: campaign.merchant_id,
      merchant_name: merchantName,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency || "IDR",
      payment_type: paymentOrder.payment_type || "Midtrans Sandbox Simulator",
      status: "PAID",
      provider: "Midtrans Sandbox",
      sandbox: true,
      created_at: paymentOrder.created_at,
      paid_at: paymentOrder.paid_at || paymentOrder.updated_at,
      payer_email: payerUser?.display_name || null,
      disclaimer:
        "BUKTI PEMBAYARAN GETRA - TRANSAKSI UJI COBA MIDTRANS SANDBOX (TIDAK MENARIK DANA RIIL)",
    };
  }
}
