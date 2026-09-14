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

  const variations = [grossAmount];
  if (grossAmount.includes(".")) {
    variations.push(grossAmount.split(".")[0]);
  } else {
    variations.push(`${grossAmount}.00`);
  }

  return variations.some((variant) => {
    const expected = computeMidtransSignature(orderId, statusCode, variant, serverKey);
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(providedSignature, "utf8");
    return expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);
  });
}
