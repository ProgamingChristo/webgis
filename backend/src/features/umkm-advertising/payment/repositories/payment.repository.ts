import { SupabaseClient } from "@supabase/supabase-js";
import { AdPaymentOrderRecord, PaymentStatus } from "../types/payment.types";

export class PaymentRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async createPaymentOrder(order: {
    campaign_id: string;
    created_by: string;
    order_id: string;
    amount: number;
    currency?: string;
    status?: PaymentStatus;
    provider?: string;
    snap_token?: string | null;
    snap_redirect_url?: string | null;
  }): Promise<AdPaymentOrderRecord> {
    const { data, error } = await this.supabase
      .from("ad_payment_orders")
      .insert({
        campaign_id: order.campaign_id,
        created_by: order.created_by,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency || "IDR",
        status: order.status || "CREATED",
        provider: order.provider || "MIDTRANS",
        snap_token: order.snap_token || null,
        snap_redirect_url: order.snap_redirect_url || null,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[PaymentRepository] Error inserting payment order:", error);
      throw new Error("Gagal menyimpan data payment order.");
    }

    return data as AdPaymentOrderRecord;
  }

  async getPaymentOrderByOrderId(orderId: string): Promise<AdPaymentOrderRecord | null> {
    const { data, error } = await this.supabase
      .from("ad_payment_orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      console.error("[PaymentRepository] Error fetching order by order_id:", error);
      throw new Error("Gagal mencari payment order.");
    }

    return data as AdPaymentOrderRecord | null;
  }

  async getLatestPaymentOrderByCampaignId(
    campaignId: string
  ): Promise<AdPaymentOrderRecord | null> {
    const { data, error } = await this.supabase
      .from("ad_payment_orders")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[PaymentRepository] Error fetching latest payment order:", error);
      throw new Error("Gagal mencari payment order campaign.");
    }

    return data as AdPaymentOrderRecord | null;
  }

  async updatePaymentOrder(
    id: string,
    updates: Partial<{
      status: PaymentStatus;
      provider_transaction_id: string | null;
      provider_transaction_status: string | null;
      payment_type: string | null;
      fraud_status: string | null;
      snap_token: string | null;
      snap_redirect_url: string | null;
      paid_at: string | null;
      expired_at: string | null;
    }>
  ): Promise<AdPaymentOrderRecord> {
    const { data, error } = await this.supabase
      .from("ad_payment_orders")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[PaymentRepository] Error updating payment order:", error);
      throw new Error("Gagal memperbarui status payment order.");
    }

    return data as AdPaymentOrderRecord;
  }
}
