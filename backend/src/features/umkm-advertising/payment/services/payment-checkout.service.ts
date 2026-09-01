import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { DEFAULT_SANDBOX_TEST_AMOUNT_IDR } from "../constants/payment.constants";
import { CreateCheckoutDTO } from "../types/payment.types";
import { PaymentRepository } from "../repositories/payment.repository";
import { MidtransClient } from "../providers/midtrans/midtrans.client";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";

export class PaymentCheckoutService {
  private repo: PaymentRepository;
  private midtransClient: MidtransClient;
  private eligibilityService: AdvertisingEligibilityService;

  constructor(
    private readonly supabase: SupabaseClient<any>,
    midtransClient?: MidtransClient,
    eligibilityService?: AdvertisingEligibilityService
  ) {
    this.repo = new PaymentRepository(supabase);
    this.midtransClient = midtransClient || new MidtransClient();
    this.eligibilityService =
      eligibilityService ||
      new AdvertisingEligibilityService(
        supabase,
        new MerchantOwnershipService(supabase)
      );
  }

  async createCheckout(campaignId: string, userId: string): Promise<CreateCheckoutDTO> {
    // 1. Resolve the campaign first; authorization is evaluated against its
    // canonical merchant below, never against claim history or UI state.
    const { data: campaign, error: cError } = await this.supabase
      .from("ad_campaigns")
      .select("id, name, status, merchant_id")
      .eq("id", campaignId)
      .single();

    if (cError || !campaign) {
      throw new ApplicationError("NOT_FOUND", "Campaign tidak ditemukan.");
    }

    if (campaign.status === "ENDED" || campaign.status === "CANCELLED") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Campaign dalam status terminal tidak dapat diproses pembayarannya."
      );
    }

    // 2. Reuse the single server-side advertising policy. This enforces UMKM
    // mode, canonical active ownership, verification, publication, and geometry.
    const eligibility = await this.eligibilityService.checkEligibility(
      userId,
      campaign.merchant_id
    );

    if (!eligibility.eligible) {
      const eligibilityMessages: Record<string, string> = {
        UNAUTHENTICATED: "Autentikasi diperlukan untuk pembayaran campaign.",
        UMKM_MODE_REQUIRED:
          "Stakeholder mode UMKM diperlukan untuk pembayaran campaign.",
        MERCHANT_NOT_FOUND: "Merchant campaign tidak ditemukan.",
        OWNERSHIP_PENDING: "Verifikasi kepemilikan merchant masih ditinjau.",
        OWNERSHIP_REQUIRED:
          "Anda bukan pemilik aktif merchant yang terkait dengan campaign ini.",
        MERCHANT_INACTIVE: "Merchant belum dipublikasikan.",
        MERCHANT_UNVERIFIED: "Merchant belum terverifikasi.",
        GEOMETRY_INVALID: "Lokasi merchant belum valid untuk promosi.",
      };

      throw new ApplicationError(
        "FORBIDDEN",
        eligibilityMessages[eligibility.reason || ""] ||
          "Merchant belum memenuhi syarat untuk pembayaran campaign."
      );
    }

    // 3. Check if already PAID
    const latestOrder = await this.repo.getLatestPaymentOrderByCampaignId(campaignId);
    if (latestOrder && latestOrder.status === "PAID") {
      return {
        payment_order_id: latestOrder.id,
        order_id: latestOrder.order_id,
        snap_token: latestOrder.snap_token || "",
        snap_redirect_url: latestOrder.snap_redirect_url,
        amount: latestOrder.amount,
        currency: latestOrder.currency,
        status: "PAID",
        sandbox: true,
      };
    }

    // 4. Reuse pending order if recent with valid snap token (anti-duplicate)
    if (
      latestOrder &&
      latestOrder.status === "PENDING" &&
      latestOrder.snap_token &&
      Date.now() - new Date(latestOrder.created_at).getTime() < 30 * 60 * 1000 // 30 mins
    ) {
      return {
        payment_order_id: latestOrder.id,
        order_id: latestOrder.order_id,
        snap_token: latestOrder.snap_token,
        snap_redirect_url: latestOrder.snap_redirect_url,
        amount: latestOrder.amount,
        currency: latestOrder.currency,
        status: "PENDING",
        sandbox: true,
      };
    }

    // 5. Determine Server-Side Trusted Amount
    const envAmount = process.env.MIDTRANS_SANDBOX_TEST_AMOUNT_IDR;
    const amount = envAmount && parseInt(envAmount, 10) > 0
      ? parseInt(envAmount, 10)
      : DEFAULT_SANDBOX_TEST_AMOUNT_IDR;

    // 6. Generate Opaque Order ID
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `GETRA-AD-${Date.now()}-${randomSuffix}`;

    // 7. Call Midtrans Snap Sandbox
    const snapResult = await this.midtransClient.createSnapTransaction({
      orderId,
      amount,
      customerEmail: undefined,
      itemName: `PEMBAYARAN UJI MIDTRANS SANDBOX - ${campaign.name.substring(0, 30)}`,
    });

    // 8. Persist Order in Database
    const createdOrder = await this.repo.createPaymentOrder({
      campaign_id: campaignId,
      created_by: userId,
      order_id: orderId,
      amount,
      currency: "IDR",
      status: "PENDING",
      provider: "MIDTRANS",
      snap_token: snapResult.token,
      snap_redirect_url: snapResult.redirect_url,
    });

    return {
      payment_order_id: createdOrder.id,
      order_id: createdOrder.order_id,
      snap_token: snapResult.token,
      snap_redirect_url: snapResult.redirect_url,
      amount,
      currency: "IDR",
      status: "PENDING",
      sandbox: true,
    };
  }
}
