import { PaymentStatusType } from "../constants/payment.constants";

export type PaymentStatus = PaymentStatusType;

export interface AdPaymentOrderRecord {
  id: string;
  campaign_id: string;
  created_by: string;
  order_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_transaction_id: string | null;
  provider_transaction_status: string | null;
  payment_type: string | null;
  fraud_status: string | null;
  snap_token: string | null;
  snap_redirect_url: string | null;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckoutDTO {
  payment_order_id: string;
  order_id: string;
  snap_token: string;
  snap_redirect_url: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  sandbox: boolean;
}

export interface PaymentStatusDTO {
  campaign_id: string;
  payment_order_id: string | null;
  order_id: string | null;
  status: PaymentStatus | "UNPAID";
  amount: number | null;
  currency: string | null;
  provider: string | null;
  provider_transaction_status: string | null;
  paid_at: string | null;
  sandbox: boolean;
}
