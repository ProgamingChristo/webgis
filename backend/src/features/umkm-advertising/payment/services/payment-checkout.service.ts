import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { DEFAULT_SANDBOX_TEST_AMOUNT_IDR } from "../constants/payment.constants";
import { CreateCheckoutDTO } from "../types/payment.types";
import { PaymentRepository } from "../repositories/payment.repository";
import { MidtransClient } from "../providers/midtrans/midtrans.client";

export class PaymentCheckoutService {
  private repo: PaymentRepository;
  private midtransClient: MidtransClient;

  constructor(
    private readonly supabase: SupabaseClient<any>,
    midtransClient?: MidtransClient
  ) {
    this.repo = new PaymentRepository(supabase);
    this.midtransClient = midtransClient || new MidtransClient();
  }

  async createCheckout(campaignId: string, userId: string): Promise<CreateCheckoutDTO> {
    // 1. Verify UMKM Stakeholder Mode or Admin
    const { data: modes } = await this.supabase
      .from("user_stakeholder_modes")
      .select("mode")
      .eq("user_id", userId);

    const hasUmkmMode = (modes || []).some((m: any) => m.mode === "UMKM");

    const { data: profile } = await this.supabase
      .from("profiles")
      .select("account_role")
      .eq("id", userId)
      .single();

    const isAdmin = profile?.account_role === "ADMIN";

    if (!hasUmkmMode && !isAdmin) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Akses ditolak: Stakeholder mode UMKM diperlukan untuk pembayaran campaign."
      );
    }

    // 2. Fetch Campaign & Validate Merchant Ownership
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

    const { data: merchant, error: mError } = await this.supabase
      .from("merchants")
      .select("id, name, owner_id")
      .eq("id", campaign.merchant_id)
      .single();

    if (mError || !merchant) {
      throw new ApplicationError("NOT_FOUND", "Merchant campaign tidak ditemukan.");
    }

    if (merchant.owner_id !== userId && !isAdmin) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Akses ditolak: Anda bukan pemilik merchant yang terkait dengan campaign ini."
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
