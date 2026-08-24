import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignAnalyticsService } from "@/src/features/umkm-advertising/analytics/services/campaign-analytics.service";

describe("CampaignAnalyticsService", () => {
  let mockSupabase: any;
  let service: CampaignAnalyticsService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
    service = new CampaignAnalyticsService(mockSupabase);
  });

  it("should aggregate campaign analytics metrics and compute Sponsored Pin CTR correctly", async () => {
    const userId = "merchant-owner-1";
    const campaignId = "camp-123";
    const merchantId = "merch-123";

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: campaignId,
                  name: "Campaign Promo 2026",
                  status: "ACTIVE",
                  merchant_id: merchantId,
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
                  name: "Warung Kopi Selamat",
                  owner_id: userId,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "campaign_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [
                    {
                      event_type: "IMPRESSION",
                      placement: "SPONSORED_PIN",
                      occurred_at: "2026-08-23T10:00:00Z",
                    },
                    {
                      event_type: "IMPRESSION",
                      placement: "SPONSORED_PIN",
                      occurred_at: "2026-08-23T11:00:00Z",
                    },
                    {
                      event_type: "SPONSORED_PIN_CLICK",
                      placement: "SPONSORED_PIN",
                      occurred_at: "2026-08-23T11:05:00Z",
                    },
                    {
                      event_type: "PROFILE_OPEN",
                      placement: "CONTEXTUAL_BANNER",
                      occurred_at: "2026-08-23T12:00:00Z",
                    },
                    {
                      event_type: "ROUTE_REQUEST",
                      placement: "PROFILE_POSTER",
                      occurred_at: "2026-08-23T13:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await service.getCampaignAnalytics(campaignId, userId);

    expect(result.campaign.id).toBe(campaignId);
    expect(result.summary.impressions).toBe(2);
    expect(result.summary.sponsored_pin_clicks).toBe(1);
    expect(result.summary.profile_opens).toBe(1);
    expect(result.summary.route_requests).toBe(1);
    // CTR = (1 / 2) * 100% = 50.0%
    expect(result.summary.sponsored_pin_ctr).toBe(50.0);
    expect(result.timeseries).toHaveLength(1);
    expect(result.placement_breakdown).toHaveLength(3);
  });

  it("should deny access when user is not the merchant owner and not admin", async () => {
    const userId = "intruder-user";
    const campaignId = "camp-123";
    const merchantId = "merch-123";

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: campaignId,
                  name: "Campaign Promo",
                  status: "ACTIVE",
                  merchant_id: merchantId,
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
                  name: "Warung Kopi",
                  owner_id: "other-owner",
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
                data: { account_role: "USER" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(service.getCampaignAnalytics(campaignId, userId)).rejects.toThrow(
      "Anda tidak memiliki izin"
    );
  });

  it("should handle division by zero for CTR gracefully (0.0% when 0 impressions)", async () => {
    const userId = "merchant-owner-1";
    const campaignId = "camp-123";
    const merchantId = "merch-123";

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: campaignId, name: "Campaign", merchant_id: merchantId },
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
                data: { id: merchantId, owner_id: userId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "campaign_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await service.getCampaignAnalytics(campaignId, userId);
    expect(result.summary.impressions).toBe(0);
    expect(result.summary.sponsored_pin_ctr).toBe(0.0);
  });
});
