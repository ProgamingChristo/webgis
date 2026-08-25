export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  status_message?: string;
  merchant_id?: string;
}

export interface MidtransStatusResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  currency?: string;
  payment_type?: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  signature_key?: string;
}

export interface CreateSnapTransactionParams {
  orderId: string;
  amount: number;
  customerEmail?: string | null;
  itemName?: string;
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}
