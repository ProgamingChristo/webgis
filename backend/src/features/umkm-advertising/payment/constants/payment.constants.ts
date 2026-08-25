export const MIDTRANS_SANDBOX_SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
export const MIDTRANS_SANDBOX_API_BASE_URL = "https://api.sandbox.midtrans.com/v2";

export const DEFAULT_SANDBOX_TEST_AMOUNT_IDR = 50000;

export const PAYMENT_STATUSES = [
  "CREATED",
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type PaymentStatusType = (typeof PAYMENT_STATUSES)[number];

// Legal state transitions: terminal states (PAID, FAILED, EXPIRED, CANCELLED, REFUNDED) cannot be reverted by older webhooks
export const LEGAL_STATUS_TRANSITIONS: Record<PaymentStatusType, readonly PaymentStatusType[]> = {
  CREATED: ["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"],
  PENDING: ["PAID", "FAILED", "EXPIRED", "CANCELLED"],
  PAID: ["REFUNDED"], // PAID cannot transition back to PENDING, FAILED, or EXPIRED
  FAILED: [],
  EXPIRED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionPaymentStatus(
  currentStatus: PaymentStatusType,
  newStatus: PaymentStatusType
): boolean {
  if (currentStatus === newStatus) return true;
  const allowed = LEGAL_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}
