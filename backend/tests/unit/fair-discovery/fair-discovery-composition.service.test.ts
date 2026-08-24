import { describe, it, expect, vi, beforeEach } from "vitest";
import { FairDiscoveryCompositionService } from "@/src/features/fair-discovery/services/fair-discovery-composition.service";
import { SponsoredPlacementAdapter } from "@/src/features/fair-discovery/integrations/sponsored-placement.adapter";
import { SponsoredPinDTO } from "@/src/features/umkm-advertising";
import { GeoPoint } from "@/src/features/fair-discovery/types/fair-discovery.types";

describe("FairDiscoveryCompositionService", () => {
  let mockSupabase: any;
  let service: FairDiscoveryCompositionService;

  const mockOrigin: GeoPoint = {
    longitude: 106.78,
    latitude: -6.18,
  };

  const mockDbMerchants = [
    {
      id: "merchant-1",
      name: "Kedai Kopi Alpha",
      address: "Jl. Alpha 1",
      description: "Kopi lokal nikmat",
      location: JSON.stringify({ type: "Point", coordinates: [106.781, -6.181] }), // ~150m
      primary_category_id: "CAFE",
      data_quality_score: 90, // Hidden Gem candidate
      price_level: "AFFORDABLE",
    },
    {
      id: "merchant-2",
      name: "Toko Kelontong Beta",
      address: "Jl. Beta 2",
      description: "Sembako lengkap",
      location: JSON.stringify({ type: "Point", coordinates: [106.785, -6.185] }), // ~750m
      primary_category_id: "RETAIL",
      data_quality_score: 60,
      price_level: "CHEAP",
    },
    {
      id: "merchant-3",
      name: "Warung Makan Gamma",
      address: "Jl. Gamma 3",
      description: "Nasi rames",
      location: JSON.stringify({ type: "Point", coordinates: [106.79, -6.19] }), // ~1.5km
      primary_category_id: "WARUNG",
      data_quality_score: 70,
      price_level: "CHEAP",
    },
  ];

  const mockSponsoredCandidate: SponsoredPinDTO = {
    placement_type: "SPONSORED_PIN",
    sponsored: true,
    label: "Sponsored",
    campaign_id: "campaign-123",
    creative_id: "creative-456",
    merchant_id: "merchant-sponsored-1",
    merchant_name: "Kopi Mantap Sponsor",
    merchant_category: "CAFE",
    headline: "Diskon 50% Kopi Espresso",
    description: "Promo kopi spesial minggu ini",
    image_url: "https://example.com/kopi.jpg",
    cta_type: "REQUEST_ROUTE",
    geometry: {
      type: "Point",
      coordinates: [106.782, -6.182],
    },
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "merchants") {
          return {
            select: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: mockDbMerchants,
                error: null,
              }),
            }),
          };
        }
        if (table === "ad_campaigns") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };

    service = new FairDiscoveryCompositionService(mockSupabase);
  });

  it("should separate results into distinct original, hidden_gems, and sponsored buckets", async () => {
    vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
      mockSponsoredCandidate,
    ]);

    const result = await service.discover({
      origin: mockOrigin,
      radiusMeters: 3000,
    });

    expect(result).toHaveProperty("original");
    expect(result).toHaveProperty("hidden_gems");
    expect(result).toHaveProperty("sponsored");

    // Hidden gem identified based on data_quality_score >= 80
    expect(result.hidden_gems).toHaveLength(1);
    expect(result.hidden_gems[0].id).toBe("merchant-1");
    expect(result.hidden_gems[0].gem_badge).toBe("HIDDEN_GEM");

    // Regular original merchants
    expect(result.original.length).toBeGreaterThanOrEqual(1);

    // Sponsored placement present and capped
    expect(result.sponsored).toHaveLength(1);
    expect(result.sponsored[0].campaign_id).toBe("campaign-123");
    expect(result.sponsored[0].label).toBe("Sponsored");
  });

  it("should preserve organic ordering immutability (ordered strictly by distance)", async () => {
    vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([]);

    const resultWithoutAds = await service.discover({
      origin: mockOrigin,
      radiusMeters: 3000,
    });

    vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
      mockSponsoredCandidate,
    ]);

    const resultWithAds = await service.discover({
      origin: mockOrigin,
      radiusMeters: 3000,
    });

    // The order of original merchants must be identical
    const idsWithoutAds = resultWithoutAds.original.map((m) => m.id);
    const idsWithAds = resultWithAds.original.map((m) => m.id);

    expect(idsWithAds).toEqual(idsWithoutAds);
  });

  it("should enforce category filter hard constraint on both organic and sponsored results", async () => {
    const adapter = new SponsoredPlacementAdapter(mockSupabase);
    vi.spyOn((adapter as any).adServingService, "getSponsoredPinCandidates").mockResolvedValue([
      mockSponsoredCandidate, // Category: CAFE
      {
        ...mockSponsoredCandidate,
        campaign_id: "campaign-fashion",
        merchant_name: "Toko Baju Trendy",
        merchant_category: "FASHION",
        headline: "Diskon Kaos",
      },
    ]);

    // Search specifically for "kopi" / "cafe"
    const eligible = await adapter.getEligibleSponsoredPlacements({
      origin: mockOrigin,
      category: "CAFE",
    });

    expect(eligible).toHaveLength(1);
    expect(eligible[0].campaign_id).toBe("campaign-123");
  });

  it("should deduplicate: remove sponsored merchant from duplicate organic appearance", async () => {
    // A merchant that exists in both organic DB and sponsored ad
    const duplicateSponsored: SponsoredPinDTO = {
      ...mockSponsoredCandidate,
      merchant_id: "merchant-2", // Same as Toko Kelontong Beta
    };

    vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockResolvedValue([
      duplicateSponsored,
    ]);

    const result = await service.discover({
      origin: mockOrigin,
      radiusMeters: 3000,
    });

    expect(result.sponsored).toHaveLength(1);
    expect(result.sponsored[0].merchant_id).toBe("merchant-2");

    // merchant-2 must NOT appear in original results to prevent duplicate UI rendering
    const originalIds = result.original.map((m) => m.id);
    expect(originalIds).not.toContain("merchant-2");
  });

  it("should isolate failure: if Ad Serving fails or throws, organic discovery succeeds with sponsored: []", async () => {
    vi.spyOn(SponsoredPlacementAdapter.prototype, "getEligibleSponsoredPlacements").mockRejectedValue(
      new Error("Ad serving engine connection error")
    );

    const result = await service.discover({
      origin: mockOrigin,
      radiusMeters: 3000,
    });

    expect(result.original.length).toBeGreaterThan(0);
    expect(result.sponsored).toEqual([]);
    expect(result.metadata.sponsored_available).toBe(false);
  });
});
