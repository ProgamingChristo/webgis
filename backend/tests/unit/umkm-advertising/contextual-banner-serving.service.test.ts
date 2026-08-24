import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContextualBannerServingService } from "@/src/features/umkm-advertising/contextual-banner/services/contextual-banner-serving.service";

describe("ContextualBannerServingService", () => {
  let mockSupabase: any;
  let service: ContextualBannerServingService;

  const mockContext = {
    longitude: 106.78,
    latitude: -6.18,
    radiusMeters: 3000,
    category: "CAFE",
  };

  const mockCampaign = {
    id: "campaign-banner-1",
    merchant_id: "merchant-1",
    status: "ACTIVE",
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
  };

  const mockMerchant = {
    id: "merchant-1",
    name: "Kopi Kenangan Senopati",
    primary_category_id: "CAFE",
    publish_status: "PUBLISHED",
    verification_status: "VERIFIED",
    location: JSON.stringify({ type: "Point", coordinates: [106.781, -6.181] }),
  };

  const mockCreative = {
    id: "creative-banner-1",
    campaign_id: "campaign-banner-1",
    creative_type: "CONTEXTUAL_BANNER",
    headline: "Diskon 40% Kopi Sore",
    description: "Promo kopi susu terbaik untuk commuter",
    image_path: "https://example.com/banner.jpg",
    cta_type: "VIEW_PROFILE",
    status: "READY",
  };

  const mockTarget = {
    id: "target-1",
    campaign_id: "campaign-banner-1",
    target_type: "RADIUS",
    center_location: JSON.stringify({ type: "Point", coordinates: [106.78, -6.18] }),
    radius_meters: 5000,
  };

  const createMockDb = (customData?: {
    campaigns?: any[];
    merchant?: any;
    creative?: any;
    target?: any;
  }) => {
    const campaigns = customData?.campaigns ?? [mockCampaign];
    const merchant = customData?.merchant ?? mockMerchant;
    const creative = customData?.creative ?? mockCreative;
    const target = customData?.target ?? mockTarget;

    return {
      from: vi.fn((table: string) => {
        if (table === "ad_campaigns") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: campaigns,
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
                  data: merchant,
                  error: merchant ? null : { code: "PGRST116" },
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: merchant,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "ad_creatives") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn(() => {
                // If checking campaign_id for readiness list
                return {
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: creative,
                      error: creative ? null : { code: "PGRST116" },
                    }),
                  }),
                  single: vi.fn().mockResolvedValue({
                    data: creative,
                    error: creative ? null : { code: "PGRST116" },
                  }),
                  then: (resolve: any) => resolve({ data: creative ? [creative] : [], error: null }),
                };
              }),
            }),
          };
        }
        if (table === "ad_campaign_targets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: target,
                  error: target ? null : { code: "PGRST116" },
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: target,
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
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
  };

  beforeEach(() => {
    mockSupabase = createMockDb();
    service = new ContextualBannerServingService(mockSupabase);
  });

  it("should serve contextual banner when active, ready, within target, and relevant", async () => {
    const banner = await service.getEligibleBanner(mockContext);

    expect(banner).not.toBeNull();
    expect(banner?.placement_type).toBe("CONTEXTUAL_BANNER");
    expect(banner?.label).toBe("Sponsored");
    expect(banner?.headline).toBe("Diskon 40% Kopi Sore");
    expect(banner?.merchant_name).toBe("Kopi Kenangan Senopati");
    expect(banner?.cta_type).toBe("VIEW_PROFILE");
  });

  it("should return null if campaign status is PAUSED", async () => {
    mockSupabase = createMockDb({
      campaigns: [{ ...mockCampaign, status: "PAUSED" }],
    });
    service = new ContextualBannerServingService(mockSupabase);

    const banner = await service.getEligibleBanner(mockContext);
    expect(banner).toBeNull();
  });

  it("should return null if CONTEXTUAL_BANNER creative is in DRAFT status", async () => {
    mockSupabase = createMockDb({
      creative: { ...mockCreative, status: "DRAFT" },
    });
    service = new ContextualBannerServingService(mockSupabase);

    const banner = await service.getEligibleBanner(mockContext);
    expect(banner).toBeNull();
  });

  it("should enforce category filter hard constraint (excludes irrelevant category)", async () => {
    const banner = await service.getEligibleBanner({
      ...mockContext,
      category: "AUTOMOTIVE", // Merchant is CAFE
    });

    expect(banner).toBeNull();
  });

  it("should return null if user location is outside targeting radius", async () => {
    const banner = await service.getEligibleBanner({
      ...mockContext,
      longitude: 107.50, // Far outside (Bandung coordinates)
      latitude: -6.90,
    });

    expect(banner).toBeNull();
  });

  it("should isolate failure: returns null gracefully if database throws an exception", async () => {
    mockSupabase.from = vi.fn().mockImplementation(() => {
      throw new Error("Database timeout error");
    });

    const banner = await service.getEligibleBanner(mockContext);
    expect(banner).toBeNull();
  });
});
