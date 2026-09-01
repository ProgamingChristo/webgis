import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { PaymentStatusDTO } from "../types/payment.types";
import { PaymentRepository } from "../repositories/payment.repository";
import { MidtransClient } from "../providers/midtrans/midtrans.client";
import { mapMidtransStatusToPaymentStatus } from "../providers/midtrans/midtrans.mapper";
import { canTransitionPaymentStatus } from "../constants/payment.constants";
import { AdvertisingEligibilityService } from "../../services/advertising-eligibility.service";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { CampaignLifecycleService } from "../../lifecycle/services/campaign-lifecycle.service";

export class PaymentStatusService {
  private repo: PaymentRepository;
  private midtransClient: MidtransClient;
  private eligibilityService: AdvertisingEligibilityService;
  private lifecycleService: CampaignLifecycleService;

  constructor(
    private readonly supabase: SupabaseClient<any>,
    midtransClient?: MidtransClient
  ) {
    this.repo = new PaymentRepository(supabase);
    this.midtransClient = midtransClient || new MidtransClient();
    this.eligibilityService = new AdvertisingEligibilityService(
      supabase,
      new MerchantOwnershipService(supabase)
    );
    this.lifecycleService = new CampaignLifecycleService(supabase);
  }

  private async verifyCampaignAccess(
    campaignId: string,
    userId: string,
    allowAdminRead: boolean
  ): Promise<string> {
    const { data: campaign, error: cError } = await this.supabase
      .from("ad_campaigns")
      .select("merchant_id")
      .eq("id", campaignId)
      .single();

    if (cError || !campaign) {
      throw new ApplicationError("NOT_FOUND", "Campaign tidak ditemukan.");
    }

    if (allowAdminRead) {
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("account_role")
        .eq("id", userId)
        .single();

      if (profile?.account_role === "ADMIN") {
        return campaign.merchant_id;
      }
    }

    const eligibility = await this.eligibilityService.checkEligibility(
      userId,
      campaign.merchant_id
    );

    if (!eligibility.eligible) {
      throw new ApplicationError(
        "FORBIDDEN",
        eligibility.reason === "OWNERSHIP_PENDING"
          ? "Verifikasi kepemilikan merchant masih ditinjau."
          : "Akses ditolak: Anda bukan pemilik aktif merchant yang eligible untuk advertising."
      );
    }

    return campaign.merchant_id;
  }

  async getPaymentStatus(campaignId: string, userId: string): Promise<PaymentStatusDTO> {
    await this.verifyCampaignAccess(campaignId, userId, true);

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
    const merchantId = await this.verifyCampaignAccess(campaignId, userId, false);

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
          // Payment alone must never force an ineligible or incomplete campaign
          // ACTIVE. The lifecycle service reuses canonical merchant eligibility
          // and derives DRAFT/READY/SCHEDULED/ACTIVE from actual readiness.
          await this.lifecycleService.getLifecycleState(merchantId, campaignId);
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
