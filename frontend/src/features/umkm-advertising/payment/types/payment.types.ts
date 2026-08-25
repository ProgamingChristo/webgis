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
