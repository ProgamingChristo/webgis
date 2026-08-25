import { describe, it, expect } from "vitest";
import {
  computeMidtransSignature,
  verifyMidtransSignature,
} from "@/src/features/umkm-advertising/payment/providers/midtrans/midtrans-signature";

describe("Midtrans Signature Verification", () => {
  const serverKey = "SB-Mid-server-testkey123456";
  const orderId = "GETRA-AD-1724490000000-ABCDEF";
  const statusCode = "200";
  const grossAmount = "50000.00";

  it("computes valid SHA512 signature matching official format", () => {
    const signature = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);
    expect(signature).toBeDefined();
    expect(signature).toHaveLength(128); // 512 bits in hex
  });

  it("verifies valid signature successfully", () => {
    const signature = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);
    const isValid = verifyMidtransSignature(
      orderId,
      statusCode,
      grossAmount,
      serverKey,
      signature
    );
    expect(isValid).toBe(true);
  });

  it("rejects tampered gross amount signature", () => {
    const signature = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);
    const isValid = verifyMidtransSignature(
      orderId,
      statusCode,
      "100000.00",
      serverKey,
      signature
    );
    expect(isValid).toBe(false);
  });

  it("rejects tampered orderId signature", () => {
    const signature = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);
    const isValid = verifyMidtransSignature(
      "GETRA-AD-TAMPERED",
      statusCode,
      grossAmount,
      serverKey,
      signature
    );
    expect(isValid).toBe(false);
  });

  it("rejects missing server key or empty signature", () => {
    expect(verifyMidtransSignature(orderId, statusCode, grossAmount, "", "sig")).toBe(false);
    expect(verifyMidtransSignature(orderId, statusCode, grossAmount, serverKey, "")).toBe(false);
  });
});
