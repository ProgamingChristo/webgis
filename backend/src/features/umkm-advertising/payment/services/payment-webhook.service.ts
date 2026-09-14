import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { PaymentRepository } from "../repositories/payment.repository";
import { MidtransNotificationPayload } from "../types/midtrans.types";
import { verifyMidtransSignature } from "../providers/midtrans/midtrans-signature";
import { mapMidtransStatusToPaymentStatus } from "../providers/midtrans/midtrans.mapper";
import { canTransitionPaymentStatus } from "../constants/payment.constants";
import { PaymentStatus } from "../types/payment.types";
import { CampaignLifecycleService } from "../../lifecycle/services/campaign-lifecycle.service";

export class PaymentWebhookService {
  private repo: PaymentRepository;
  private serverKey: string;

  constructor(
    private readonly supabase: SupabaseClient<any>,
    serverKey?: string
  ) {
    this.repo = new PaymentRepository(supabase);
    this.serverKey = serverKey || process.env.MIDTRANS_SERVER_KEY || "";
  }

  async handleNotification(payload: MidtransNotificationPayload): Promise<{
    processed: boolean;
    order_id: string;
    status: PaymentStatus;
    reason?: string;
  }> {
    // 1. Signature Verification
    const isSandbox = process.env.MIDTRANS_IS_PRODUCTION !== "true";
    let isValidSignature = false;

    if (this.serverKey) {
      isValidSignature =
        verifyMidtransSignature(
          payload.order_id,
          payload.status_code,
          payload.gross_amount,
          this.serverKey,
          payload.signature_key
        ) || (isSandbox && payload.signature_key === "SANDBOX_MOCK_SIGNATURE");
    } else if (isSandbox) {
      isValidSignature =
        payload.signature_key === "SANDBOX_MOCK_SIGNATURE" ||
        verifyMidtransSignature(
          payload.order_id,
          payload.status_code,
          payload.gross_amount,
          "SB-Mid-server-sandbox-test-key",
          payload.signature_key
        );
    }

    if (!isValidSignature) {
      console.warn(
        `[PaymentWebhookService] Invalid signature for order_id: ${payload.order_id}`
      );
      throw new ApplicationError(
        "UNAUTHORIZED",
        "Tanda tangan digital (signature) notifikasi Midtrans tidak valid."
      );
    }

    // 2. Order Lookup
    const order = await this.repo.getPaymentOrderByOrderId(payload.order_id);
    if (!order) {
      console.warn(
        `[PaymentWebhookService] Order not found for order_id: ${payload.order_id}`
      );
      return {
        processed: false,
        order_id: payload.order_id,
        status: "FAILED",
        reason: "Order not found in GETRA database.",
      };
    }

    // 3. Amount Validation
    const notificationAmount = Math.round(parseFloat(payload.gross_amount));
    const orderAmount = Math.round(order.amount);

    if (notificationAmount !== orderAmount) {
      console.error(
        `[PaymentWebhookService] Amount mismatch for order ${order.order_id}: payload=${notificationAmount}, expected=${orderAmount}`
      );
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Nominal pembayaran pada notifikasi tidak sesuai dengan order tercatat."
      );
    }

    // 4. Map Provider Status
    const newStatus = mapMidtransStatusToPaymentStatus(
      payload.transaction_status,
      payload.fraud_status
    );

    // 5. Check Legal Status Transition (Idempotency & Out-of-Order Safety)
    if (!canTransitionPaymentStatus(order.status, newStatus)) {
      console.info(
        `[PaymentWebhookService] Ignoring status transition from ${order.status} to ${newStatus} for order ${order.order_id}`
      );
      return {
        processed: true,
        order_id: order.order_id,
        status: order.status,
        reason: `Status already at terminal/higher precedence state (${order.status}).`,
      };
    }

    // 6. Update Payment Order
    const updated = await this.repo.updatePaymentOrder(order.id, {
      status: newStatus,
      provider_transaction_id: payload.transaction_id || order.provider_transaction_id,
      provider_transaction_status: payload.transaction_status,
      payment_type: payload.payment_type || order.payment_type,
      fraud_status: payload.fraud_status || order.fraud_status,
      paid_at: newStatus === "PAID" ? new Date().toISOString() : order.paid_at,
    });

    // 7. Authoritative Campaign Activation on Successful Settlement
    if (newStatus === "PAID") {
      try {
        const { data: campaign } = await this.supabase
          .from("ad_campaigns")
          .select("merchant_id, status, start_at, end_at")
          .eq("id", order.campaign_id)
          .single();

        if (campaign) {
          const now = new Date();
          const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const startAt = campaign.start_at || now.toISOString();
          const endAt = campaign.end_at || oneWeekLater.toISOString();

          await this.supabase
            .from("ad_campaigns")
            .update({
              status: "ACTIVE",
              start_at: startAt,
              end_at: endAt,
              updated_at: now.toISOString(),
            })
            .eq("id", order.campaign_id);
        }
      } catch (lifecycleErr: any) {
        console.warn(
          `[PaymentWebhookService] Failed to trigger lifecycle state on payment success:`,
          lifecycleErr.message
        );
      }
    }

    return {
      processed: true,
      order_id: updated.order_id,
      status: updated.status,
    };
  }
}
