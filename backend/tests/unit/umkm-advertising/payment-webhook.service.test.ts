import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentWebhookService } from "@/src/features/umkm-advertising/payment/services/payment-webhook.service";
import { computeMidtransSignature } from "@/src/features/umkm-advertising/payment/providers/midtrans/midtrans-signature";

describe("PaymentWebhookService", () => {
  let mockSupabase: any;
  const serverKey = "SB-Mid-server-testkey123456";
  const orderId = "GETRA-AD-1724490000-XYZ";

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "order-rec-123",
                order_id: orderId,
                amount: 50000,
                status: "PENDING",
                campaign_id: "camp-123",
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "order-rec-123",
                  order_id: orderId,
                  amount: 50000,
                  status: "PAID",
                },
                error: null,
              }),
            }),
          }),
        }),
      })),
    };
  });

  it("handles valid settlement notification and marks order PAID", async () => {
    const signatureKey = computeMidtransSignature(orderId, "200", "50000.00", serverKey);
    const service = new PaymentWebhookService(mockSupabase, serverKey);

    const result = await service.handleNotification({
      order_id: orderId,
      status_code: "200",
      gross_amount: "50000.00",
      signature_key: signatureKey,
      transaction_status: "settlement",
      transaction_id: "tx-midtrans-123",
    });

    expect(result.processed).toBe(true);
    expect(result.status).toBe("PAID");
  });

  it("rejects invalid signature with UNAUTHORIZED error", async () => {
    const service = new PaymentWebhookService(mockSupabase, serverKey);

    await expect(
      service.handleNotification({
        order_id: orderId,
        status_code: "200",
        gross_amount: "50000.00",
        signature_key: "invalid-signature-hash",
        transaction_status: "settlement",
      })
    ).rejects.toThrow(/signature.*tidak valid/i);
  });

  it("rejects amount mismatch and prevents marking PAID", async () => {
    const signatureKey = computeMidtransSignature(orderId, "200", "10000.00", serverKey);
    const service = new PaymentWebhookService(mockSupabase, serverKey);

    await expect(
      service.handleNotification({
        order_id: orderId,
        status_code: "200",
        gross_amount: "10000.00", // Mismatched from 50000
        signature_key: signatureKey,
        transaction_status: "settlement",
      })
    ).rejects.toThrow(/Nominal pembayaran.*tidak sesuai/i);
  });

  it("handles unknown order safely without creating rogue records", async () => {
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));

    const unknownOrderId = "GETRA-AD-UNKNOWN-999";
    const signatureKey = computeMidtransSignature(unknownOrderId, "200", "50000.00", serverKey);
    const service = new PaymentWebhookService(mockSupabase, serverKey);

    const result = await service.handleNotification({
      order_id: unknownOrderId,
      status_code: "200",
      gross_amount: "50000.00",
      signature_key: signatureKey,
      transaction_status: "settlement",
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toContain("Order not found");
  });

  it("is idempotent and handles out-of-order notifications without downgrading PAID state", async () => {
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: "order-rec-123",
              order_id: orderId,
              amount: 50000,
              status: "PAID", // Already PAID
              campaign_id: "camp-123",
            },
            error: null,
          }),
        }),
      }),
    }));

    const signatureKey = computeMidtransSignature(orderId, "201", "50000.00", serverKey);
    const service = new PaymentWebhookService(mockSupabase, serverKey);

    // Later arrival of earlier 'pending' notification
    const result = await service.handleNotification({
      order_id: orderId,
      status_code: "201",
      gross_amount: "50000.00",
      signature_key: signatureKey,
      transaction_status: "pending",
    });

    expect(result.processed).toBe(true);
    expect(result.status).toBe("PAID"); // Retained PAID
    expect(result.reason).toContain("higher precedence");
  });
});
