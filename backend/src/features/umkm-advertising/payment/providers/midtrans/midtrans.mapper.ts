import { PaymentStatus } from "../../types/payment.types";

/**
 * Maps external Midtrans transaction_status and fraud_status to internal GETRA PaymentStatus
 */
export function mapMidtransStatusToPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string | null
): PaymentStatus {
  const normalized = (transactionStatus || "").toLowerCase().trim();
  const normalizedFraud = (fraudStatus || "").toLowerCase().trim();

  switch (normalized) {
    case "settlement":
      return "PAID";

    case "capture":
      if (normalizedFraud === "challenge") {
        return "PENDING";
      }
      if (normalizedFraud === "accept" || !normalizedFraud) {
        return "PAID";
      }
      return "FAILED";

    case "pending":
      return "PENDING";

    case "deny":
      return "FAILED";

    case "expire":
      return "EXPIRED";

    case "cancel":
      return "CANCELLED";

    case "refund":
    case "partial_refund":
      return "REFUNDED";

    default:
      console.warn(
        `[MidtransMapper] Unknown or unhandled transaction_status: "${transactionStatus}". Defaulting to FAILED.`
      );
      return "FAILED";
  }
}
