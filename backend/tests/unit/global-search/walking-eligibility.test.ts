import { describe, expect, it, vi, beforeEach } from "vitest";

import { globalSearchQuerySchema } from "@/src/features/global-search/global-search.schema";
import { GlobalSearchService } from "@/src/features/global-search/global-search.service";
import { CanonicalMerchantReadService } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";
import { CommuterNetworkRepository } from "@/src/features/commuter/commuter-network.repository";

describe("walking network eligibility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("filters merchants strictly by backend pedestrian network walking duration", async () => {
    // 3 candidates:
    // m-1: close straight-line (150m), pedestrian route 240s (4 mins) -> eligible for 10m limit
    // m-2: close straight-line (200m), pedestrian route 720s (12 mins, due to barriers/highway) -> EXCLUDED
    // m-3: close straight-line (180m), pedestrian route UNROUTABLE -> EXCLUDED
    const mockMerchants = [
      {
        id: "m-1",
        name: "Warung Kopi Dekat",
        category: "Makanan dan Minuman",
        brand: "Makanan dan Minuman",
        longitude: 106.828,
        latitude: -6.176,
        distanceMeters: 150, // PostGIS spatial proximity
        walkingMinutes: null,
        accessibilityScore: 85,
        priceLabel: "Hemat",
        openNow: true,
        openStatusKnown: true,
        openingStatus: "OPEN",
        source: "PREMIUM",
        sources: ["PREMIUM"],
        status: "verified",
        updatedAt: "2026-09-11T00:00:00Z",
        limitation: "Canonical merchant",
        provenance: {},
        priceStatusKnown: true,
        observedPriceAmount: 15000,
        regionIds: ["jakarta-pusat"],
        regions: ["Jakarta Pusat"],
      },
      {
        id: "m-2",
        name: "Kedai Seberang Rel",
        category: "Makanan dan Minuman",
        brand: "Makanan dan Minuman",
        longitude: 106.829,
        latitude: -6.177,
        distanceMeters: 200, // PostGIS spatial proximity is close!
        walkingMinutes: null,
        accessibilityScore: 80,
        priceLabel: "Hemat",
        openNow: true,
        openStatusKnown: true,
        openingStatus: "OPEN",
        source: "PREMIUM",
        sources: ["PREMIUM"],
        status: "verified",
        updatedAt: "2026-09-11T00:00:00Z",
        limitation: "Canonical merchant",
        provenance: {},
        priceStatusKnown: true,
        observedPriceAmount: 20000,
        regionIds: ["jakarta-pusat"],
        regions: ["Jakarta Pusat"],
      },
      {
        id: "m-3",
        name: "Toko Pulau Terisolasi",
        category: "Makanan dan Minuman",
        brand: "Makanan dan Minuman",
        longitude: 106.830,
        latitude: -6.178,
        distanceMeters: 180, // PostGIS spatial proximity is close!
        walkingMinutes: null,
        accessibilityScore: 70,
        priceLabel: "Hemat",
        openNow: true,
        openStatusKnown: true,
        openingStatus: "OPEN",
        source: "PREMIUM",
        sources: ["PREMIUM"],
        status: "verified",
        updatedAt: "2026-09-11T00:00:00Z",
        limitation: "Canonical merchant",
        provenance: {},
        priceStatusKnown: true,
        observedPriceAmount: 18000,
        regionIds: ["jakarta-pusat"],
        regions: ["Jakarta Pusat"],
      },
    ];

    vi.spyOn(CanonicalMerchantReadService.prototype, "list").mockResolvedValue({
      merchants: mockMerchants as any,
      total: 3,
    });

    vi.spyOn(CommuterNetworkRepository.prototype, "walkingCosts").mockResolvedValue({
      status: "OK",
      candidates: [
        {
          candidate_id: "m-1",
          status: "ROUTABLE",
          distance_meters: 280,
          duration_seconds: 240, // 4 mins
          network_distance_meters: 260,
          access_distance_meters: 20,
          destination_node_id: 101,
        },
        {
          candidate_id: "m-2",
          status: "ROUTABLE",
          distance_meters: 950, // Long detour across railway/barrier
          duration_seconds: 720, // 12 mins -> EXCEEDS 10 MINS LIMIT
          network_distance_meters: 900,
          access_distance_meters: 50,
          destination_node_id: 102,
        },
        {
          candidate_id: "m-3",
          status: "UNROUTABLE",
          distance_meters: null,
          duration_seconds: null,
          network_distance_meters: null,
          access_distance_meters: null,
          destination_node_id: null,
        },
      ],
    });

    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    const service = new GlobalSearchService(mockSupabase);
    const query = globalSearchQuerySchema.parse({
      max_walking_minutes: 10,
      origin_longitude: 106.8272,
      origin_latitude: -6.1754,
    });

    const result = await service.search(query);

    // Only m-1 should be eligible
    expect(result.merchants).toHaveLength(1);
    const eligible = result.merchants[0];
    expect(eligible.id).toBe("m-1");

    // Authoritative backend network walking time
    expect(eligible.walkingMinutes).toBe(4);
    expect(eligible.networkDistanceMeters).toBe(280);
    expect(eligible.networkRouteStatus).toBe("ROUTABLE");

    // PostGIS straight-line spatial distance is preserved separately
    expect(eligible.distanceMeters).toBe(150);

    // Verify metadata exclusion reasons
    expect(result.commuter.excluded.walking_time).toBe(1); // m-2 excluded
    expect(result.commuter.excluded.unroutable).toBe(1);   // m-3 excluded
    expect(result.commuter.hard_constraints_applied).toContain("MAX_NETWORK_WALKING_MINUTES");
  });
});
