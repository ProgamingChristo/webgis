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
