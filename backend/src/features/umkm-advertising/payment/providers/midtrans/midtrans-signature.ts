import { createHash, timingSafeEqual } from "crypto";

/**
 * Computes and verifies SHA512 signature for Midtrans transaction notification:
 * Expected signature = SHA512(order_id + status_code + gross_amount + server_key)
 */
export function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  const raw = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return createHash("sha512").update(raw).digest("hex");
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  providedSignature: string
): boolean {
  if (!serverKey || !providedSignature) {
    return false;
  }

  const expectedSignature = computeMidtransSignature(
    orderId,
    statusCode,
    grossAmount,
    serverKey
  );

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(providedSignature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
