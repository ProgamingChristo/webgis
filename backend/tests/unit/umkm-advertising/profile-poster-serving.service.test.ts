import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfilePosterServingService } from "@/src/features/umkm-advertising/profile-poster/services/profile-poster-serving.service";

describe("ProfilePosterServingService", () => {
  let mockSupabase: any;
  let service: ProfilePosterServingService;

  const mockMerchantId = "merchant-1111-1111-1111-111111111111";

  const mockMerchant = {
    id: mockMerchantId,
    name: "Warung Kopi Selamat GETRA",
    primary_category_id: "CAFE",
    publish_status: "PUBLISHED",
    verification_status: "VERIFIED",
    location: JSON.stringify({ type: "Point", coordinates: [106.78, -6.18] }),
  };

  const mockCampaign = {
    id: "campaign-poster-1",
    merchant_id: mockMerchantId,
    status: "ACTIVE",
    start_at: new Date(Date.now() - 3600000).toISOString(),
    end_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
  };

  const mockCreative = {
    id: "creative-poster-1",
    campaign_id: "campaign-poster-1",
    creative_type: "PROFILE_POSTER",
    headline: "Paket Hemat Mahasiswa Rp15.000",
    description: "Khusus pelanggan transit GETRA",
    image_path: "https://example.com/poster.jpg",
    cta_type: "REQUEST_ROUTE",
    status: "READY",
  };

  const mockTarget = {
    id: "target-1",
    campaign_id: "campaign-poster-1",
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
        if (table === "merchants") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn((field: string, val: string) => {
                if (val === mockMerchantId) {
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: merchant,
                      error: merchant ? null : { code: "PGRST116" },
                    }),
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: merchant,
                      error: null,
                    }),
                  };
                }
                return {
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }),
            }),
          };
        }
        if (table === "ad_campaigns") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn((field: string, val: string) => {
                if (val === mockMerchantId) {
                  return {
                    in: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: campaigns,
                        error: null,
                      }),
                    }),
                  };
                }
                return {
                  in: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                };
              }),
            }),
          };
        }
        if (table === "ad_creatives") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn(() => {
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
    service = new ProfilePosterServingService(mockSupabase);
  });

  it("should serve profile poster when campaign is active and creative is ready for same merchant", async () => {
    const poster = await service.getProfilePosterForMerchant(mockMerchantId);

    expect(poster).not.toBeNull();
    expect(poster?.placement_type).toBe("PROFILE_POSTER");
    expect(poster?.label).toBe("Sponsored");
    expect(poster?.merchant_id).toBe(mockMerchantId);
    expect(poster?.headline).toBe("Paket Hemat Mahasiswa Rp15.000");
    expect(poster?.cta_type).toBe("REQUEST_ROUTE");
  });

  it("should enforce same-merchant rule (cross-merchant poster request returns null)", async () => {
    const differentMerchantId = "merchant-2222-2222-2222-222222222222";
    const poster = await service.getProfilePosterForMerchant(differentMerchantId);

    expect(poster).toBeNull();
  });

  it("should return null if campaign status is PAUSED", async () => {
    mockSupabase = createMockDb({
      campaigns: [{ ...mockCampaign, status: "PAUSED" }],
    });
    service = new ProfilePosterServingService(mockSupabase);

    const poster = await service.getProfilePosterForMerchant(mockMerchantId);
    expect(poster).toBeNull();
  });

  it("should return null if PROFILE_POSTER creative is in DRAFT status", async () => {
    mockSupabase = createMockDb({
      creative: { ...mockCreative, status: "DRAFT" },
    });
    service = new ProfilePosterServingService(mockSupabase);

    const poster = await service.getProfilePosterForMerchant(mockMerchantId);
    expect(poster).toBeNull();
  });

  it("should isolate failure: returns null gracefully if database throws an exception", async () => {
    mockSupabase.from = vi.fn().mockImplementation(() => {
      throw new Error("Database connection failure");
    });

    const poster = await service.getProfilePosterForMerchant(mockMerchantId);
    expect(poster).toBeNull();
  });
});
