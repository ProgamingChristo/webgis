export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED"
  | "UNPAID";

export interface CreateCheckoutDTO {
  payment_order_id: string;
  order_id: string;
  snap_token: string;
  snap_redirect_url: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  sandbox: boolean;
  client_key?: string;
}

export interface PaymentStatusDTO {
  campaign_id: string;
  payment_order_id: string | null;
  order_id: string | null;
  status: PaymentStatus;
  amount: number | null;
  currency: string | null;
  provider: string | null;
  provider_transaction_status: string | null;
  paid_at: string | null;
  sandbox: boolean;
}

export interface GetraPaymentReceiptDTO {
  invoice_number: string;
  order_id: string;
  transaction_id: string | null;
  merchant_id: string;
  merchant_name: string;
  campaign_id: string;
  campaign_name: string;
  amount: number;
  currency: string;
  payment_type: string;
  status: string;
  provider: string;
  sandbox: boolean;
  created_at: string;
  paid_at: string | null;
  payer_email: string | null;
  disclaimer: string;
}
