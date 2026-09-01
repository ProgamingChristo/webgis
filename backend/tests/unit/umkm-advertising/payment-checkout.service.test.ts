import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentCheckoutService } from "@/src/features/umkm-advertising/payment/services/payment-checkout.service";

describe("PaymentCheckoutService", () => {
  let mockSupabase: any;
  let mockMidtransClient: any;
  let mockEligibilityService: any;
  const userId = "user-umkm-123";
  const campaignId = "camp-123";
  const merchantId = "merch-123";

  beforeEach(() => {
    mockMidtransClient = {
      createSnapTransaction: vi.fn().mockResolvedValue({
        token: "snap-token-mock-xyz",
        redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/mock",
      }),
    };

    mockEligibilityService = {
      checkEligibility: vi.fn().mockResolvedValue({
        eligible: true,
        merchantId,
      }),
    };

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "user_stakeholder_modes") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ mode: "UMKM" }],
                error: null,
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { account_role: "USER", email: "test@example.com" },
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
                  data: { id: campaignId, name: "Test Campaign", status: "DRAFT", merchant_id: merchantId },
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
                  data: { id: merchantId, name: "Test Merchant", owner_id: userId },
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
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-rec-123",
                    campaign_id: campaignId,
                    created_by: userId,
                    order_id: "GETRA-AD-1724490000-XYZ",
                    amount: 50000,
                    currency: "IDR",
                    status: "PENDING",
                    provider: "MIDTRANS",
                    snap_token: "snap-token-mock-xyz",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
  });

  it("creates checkout successfully for verified UMKM owner", async () => {
    const service = new PaymentCheckoutService(
      mockSupabase,
      mockMidtransClient,
      mockEligibilityService
    );
    const result = await service.createCheckout(campaignId, userId);

    expect(result).toBeDefined();
    expect(result.status).toBe("PENDING");
    expect(result.snap_token).toBe("snap-token-mock-xyz");
    expect(result.amount).toBe(50000);
    expect(result.sandbox).toBe(true);
    expect(mockMidtransClient.createSnapTransaction).toHaveBeenCalledOnce();
  });

  it("rejects user without UMKM mode and non-admin", async () => {
    mockEligibilityService.checkEligibility.mockResolvedValue({
      eligible: false,
      reason: "UMKM_MODE_REQUIRED",
    });

    const service = new PaymentCheckoutService(
      mockSupabase,
      mockMidtransClient,
      mockEligibilityService
    );
    await expect(service.createCheckout(campaignId, userId)).rejects.toThrow(
      /Stakeholder mode UMKM diperlukan/
    );
  });

  it("rejects user attempting to checkout campaign of a non-owned merchant", async () => {
    mockEligibilityService.checkEligibility.mockResolvedValue({
      eligible: false,
      reason: "OWNERSHIP_REQUIRED",
    });

    mockSupabase.from = vi.fn((table: string) => {
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: campaignId, name: "Other Campaign", status: "DRAFT", merchant_id: merchantId },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const service = new PaymentCheckoutService(
      mockSupabase,
      mockMidtransClient,
      mockEligibilityService
    );
    await expect(service.createCheckout(campaignId, userId)).rejects.toThrow(
      /Anda bukan pemilik aktif merchant/
    );
  });
});
