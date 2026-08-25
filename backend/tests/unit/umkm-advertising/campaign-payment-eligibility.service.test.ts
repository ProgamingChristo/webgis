import { describe, it, expect, vi } from "vitest";
import { CampaignPaymentEligibilityService } from "@/src/features/umkm-advertising/payment/services/campaign-payment-eligibility.service";

describe("CampaignPaymentEligibilityService", () => {
  it("returns is_ready: false when no payment order exists", async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      })),
    };

    const service = new CampaignPaymentEligibilityService(mockSupabase);
    const result = await service.evaluatePaymentReadiness("camp-123");

    expect(result.is_ready).toBe(false);
    expect(result.payment_order).toBeNull();
    expect(result.reason).toContain("Belum ada transaksi");
  });

  it("returns is_ready: false when latest payment order is PENDING", async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-123",
                    status: "PENDING",
                    campaign_id: "camp-123",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })),
    };

    const service = new CampaignPaymentEligibilityService(mockSupabase);
    const result = await service.evaluatePaymentReadiness("camp-123");

    expect(result.is_ready).toBe(false);
    expect(result.payment_order).toBeDefined();
    expect(result.reason).toContain("PENDING");
  });

  it("returns is_ready: true when latest payment order is PAID", async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-123",
                    status: "PAID",
                    campaign_id: "camp-123",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })),
    };

    const service = new CampaignPaymentEligibilityService(mockSupabase);
    const result = await service.evaluatePaymentReadiness("camp-123");

    expect(result.is_ready).toBe(true);
    expect(result.payment_order).toBeDefined();
    expect(result.payment_order?.status).toBe("PAID");
  });
});
