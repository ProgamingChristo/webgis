import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { PaymentStatusDTO } from "../types/payment.types";
import { PaymentRepository } from "../repositories/payment.repository";
import { MidtransClient } from "../providers/midtrans/midtrans.client";
import { mapMidtransStatusToPaymentStatus } from "../providers/midtrans/midtrans.mapper";
import { canTransitionPaymentStatus } from "../constants/payment.constants";

export class PaymentStatusService {
  private repo: PaymentRepository;
  private midtransClient: MidtransClient;

  constructor(
    private readonly supabase: SupabaseClient<any>,
    midtransClient?: MidtransClient
  ) {
    this.repo = new PaymentRepository(supabase);
    this.midtransClient = midtransClient || new MidtransClient();
  }

  private async verifyCampaignOwnership(campaignId: string, userId: string): Promise<void> {
    const { data: campaign, error: cError } = await this.supabase
      .from("ad_campaigns")
      .select("merchant_id")
      .eq("id", campaignId)
      .single();

    if (cError || !campaign) {
      throw new ApplicationError("NOT_FOUND", "Campaign tidak ditemukan.");
    }

    const { data: merchant, error: mError } = await this.supabase
      .from("merchants")
      .select("owner_id")
      .eq("id", campaign.merchant_id)
      .single();

    if (mError || !merchant) {
      throw new ApplicationError("NOT_FOUND", "Merchant campaign tidak ditemukan.");
    }

    const { data: profile } = await this.supabase
      .from("profiles")
      .select("account_role")
      .eq("id", userId)
      .single();

    const isOwner = merchant.owner_id === userId;
    const isAdmin = profile?.account_role === "ADMIN";

    if (!isOwner && !isAdmin) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Akses ditolak: Anda tidak memiliki izin untuk melihat status pembayaran campaign ini."
      );
    }
  }

  async getPaymentStatus(campaignId: string, userId: string): Promise<PaymentStatusDTO> {
    await this.verifyCampaignOwnership(campaignId, userId);

    const latest = await this.repo.getLatestPaymentOrderByCampaignId(campaignId);

    if (!latest) {
      return {
        campaign_id: campaignId,
        payment_order_id: null,
        order_id: null,
        status: "UNPAID",
        amount: null,
        currency: null,
        provider: null,
        provider_transaction_status: null,
        paid_at: null,
        sandbox: true,
      };
    }

    return {
      campaign_id: campaignId,
      payment_order_id: latest.id,
      order_id: latest.order_id,
      status: latest.status,
      amount: latest.amount,
      currency: latest.currency,
      provider: latest.provider,
      provider_transaction_status: latest.provider_transaction_status,
      paid_at: latest.paid_at,
      sandbox: true,
    };
  }

  async refreshPaymentStatus(campaignId: string, userId: string): Promise<PaymentStatusDTO> {
    await this.verifyCampaignOwnership(campaignId, userId);

    const latest = await this.repo.getLatestPaymentOrderByCampaignId(campaignId);

    if (!latest) {
      return this.getPaymentStatus(campaignId, userId);
    }

    if (latest.status === "PAID") {
      return {
        campaign_id: campaignId,
        payment_order_id: latest.id,
        order_id: latest.order_id,
        status: "PAID",
        amount: latest.amount,
        currency: latest.currency,
        provider: latest.provider,
        provider_transaction_status: latest.provider_transaction_status,
        paid_at: latest.paid_at,
        sandbox: true,
      };
    }

    try {
      const providerStatus = await this.midtransClient.getTransactionStatus(latest.order_id);
      const newStatus = mapMidtransStatusToPaymentStatus(
        providerStatus.transaction_status,
        providerStatus.fraud_status
      );

      if (canTransitionPaymentStatus(latest.status, newStatus)) {
        const updated = await this.repo.updatePaymentOrder(latest.id, {
          status: newStatus,
          provider_transaction_id: providerStatus.transaction_id || latest.provider_transaction_id,
          provider_transaction_status: providerStatus.transaction_status,
          payment_type: providerStatus.payment_type || latest.payment_type,
          fraud_status: providerStatus.fraud_status || latest.fraud_status,
          paid_at: newStatus === "PAID" ? new Date().toISOString() : latest.paid_at,
        });

        if (newStatus === "PAID") {
          await this.supabase
            .from("ad_campaigns")
            .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
            .eq("id", campaignId)
            .in("status", ["DRAFT", "PENDING"]);
        }

        return {
          campaign_id: campaignId,
          payment_order_id: updated.id,
          order_id: updated.order_id,
          status: updated.status,
          amount: updated.amount,
          currency: updated.currency,
          provider: updated.provider,
          provider_transaction_status: updated.provider_transaction_status,
          paid_at: updated.paid_at,
          sandbox: true,
        };
      }
    } catch (err: any) {
      console.warn("[PaymentStatusService] Failed to query Midtrans status API:", err.message);
    }

    return {
      campaign_id: campaignId,
      payment_order_id: latest.id,
      order_id: latest.order_id,
      status: latest.status,
      amount: latest.amount,
      currency: latest.currency,
      provider: latest.provider,
      provider_transaction_status: latest.provider_transaction_status,
      paid_at: latest.paid_at,
      sandbox: true,
    };
  }
}
