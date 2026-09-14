import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentReceiptService } from "@/src/features/umkm-advertising/payment/services/payment-receipt.service";

describe("PaymentReceiptService", () => {
  let mockSupabase: any;
  const campaignId = "camp-abc-123";
  const userId = "user-owner-456";
  const merchantId = "merch-789";
  const orderId = "GETRA-AD-1724490000-TEST";

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "ad_campaigns") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: campaignId,
                    name: "Paket Mahasiswa Hemat",
                    merchant_id: merchantId,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: userId,
                    account_role: "USER",
                    display_name: "Pemilik Kopi",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "merchants") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: merchantId,
                    name: "Kopi Christo Mantap",
                    owner_id: userId,
                    publish_status: "PUBLISHED",
                    verification_status: "VERIFIED",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "ad_payment_orders") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: "order-rec-1",
                        order_id: orderId,
                        amount: 50000,
                        currency: "IDR",
                        status: "PAID",
                        provider: "MIDTRANS",
                        provider_transaction_id: "tx-midtrans-999",
                        payment_type: "qris",
                        created_at: "2026-09-14T10:00:00.000Z",
                        paid_at: "2026-09-14T10:05:00.000Z",
                        created_by: userId,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
  });

  it("generates structured GETRA receipt for settled (PAID) transaction", async () => {
    const service = new PaymentReceiptService(mockSupabase);
    const receipt = await service.getReceipt(campaignId, userId);

    expect(receipt.invoice_number).toBe("INV-SB-1724490000-TEST");
    expect(receipt.order_id).toBe(orderId);
    expect(receipt.transaction_id).toBe("tx-midtrans-999");
    expect(receipt.merchant_name).toBe("Kopi Christo Mantap");
    expect(receipt.campaign_name).toBe("Paket Mahasiswa Hemat");
    expect(receipt.amount).toBe(50000);
    expect(receipt.status).toBe("PAID");
    expect(receipt.sandbox).toBe(true);
    expect(receipt.disclaimer).toContain("MIDTRANS SANDBOX");
    expect(receipt.payer_email).toBe("Pemilik Kopi");
  });

  it("blocks unauthorized user (IDOR protection)", async () => {
    const unauthorizedUserId = "unauthorized-hacker-999";
    // Mock profiles to return normal USER for unauthorized user
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: unauthorizedUserId, account_role: "USER" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: campaignId, name: "Paket", merchant_id: merchantId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: merchantId, owner_id: "other-user", publish_status: "PUBLISHED", verification_status: "VERIFIED" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const service = new PaymentReceiptService(mockSupabase);
    await expect(service.getReceipt(campaignId, unauthorizedUserId)).rejects.toThrow(
      /Akses ditolak.*wewenang/i
    );
  });

  it("allows ADMIN user to view receipt regardless of merchant ownership", async () => {
    const adminUserId = "admin-user-001";
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: adminUserId, account_role: "ADMIN" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: campaignId, name: "Paket", merchant_id: merchantId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: merchantId, name: "Kopi Christo", owner_id: "someone-else" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_payment_orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "order-rec-1",
                      order_id: orderId,
                      amount: 50000,
                      currency: "IDR",
                      status: "PAID",
                      created_at: "2026-09-14T10:00:00.000Z",
                      paid_at: "2026-09-14T10:05:00.000Z",
                      created_by: userId,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const service = new PaymentReceiptService(mockSupabase);
    const receipt = await service.getReceipt(campaignId, adminUserId);
    expect(receipt.status).toBe("PAID");
    expect(receipt.invoice_number).toBe("INV-SB-1724490000-TEST");
  });

  it("throws VALIDATION_ERROR if payment is not yet PAID", async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: userId, account_role: "ADMIN" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: campaignId, name: "Paket", merchant_id: merchantId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "ad_payment_orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "order-rec-1",
                      order_id: orderId,
                      amount: 50000,
                      status: "PENDING", // Not paid yet
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const service = new PaymentReceiptService(mockSupabase);
    await expect(service.getReceipt(campaignId, userId)).rejects.toThrow(
      /belum lunas/i
    );
  });
});
