import { describe, expect, it, vi } from "vitest";

import { globalSearchQuerySchema } from "@/src/features/global-search/global-search.schema";
import {
  GlobalSearchService,
  resolveGlobalSearchIntent,
} from "@/src/features/global-search/global-search.service";
import type { SearchRegion } from "@/src/features/global-search/global-search.types";
import { CanonicalMerchantReadService } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

const regions: SearchRegion[] = [
  {
    id: "jakarta-pusat",
    name: "Jakarta Pusat",
    aliases: ["jakarta pusat", "jakpus"],
    bounds: { west: 106.8, south: -6.22, east: 106.87, north: -6.15 },
    geometry_source: "GADM v4.0",
  },
];

describe("nearby radius filtering & schema", () => {
  it("accepts valid radius_meters (250m, 500m, 1km, 2km) when origin coordinates are provided", () => {
    for (const radius of [250, 500, 1000, 2000]) {
      const parsed = globalSearchQuerySchema.parse({
        radius_meters: String(radius),
        origin_longitude: "106.8272",
        origin_latitude: "-6.1754",
      });
      expect(parsed.radius_meters).toBe(radius);
      expect(parsed.origin_longitude).toBe(106.8272);
      expect(parsed.origin_latitude).toBe(-6.1754);
    }
  });

  it("rejects radius_meters when origin coordinates are missing", () => {
    const result = globalSearchQuerySchema.safeParse({
      radius_meters: 500,
    });
    expect(result.success).toBe(false);
  });

  it("resolves radius constraint in resolveGlobalSearchIntent", () => {
    const query = globalSearchQuerySchema.parse({
      radius_meters: 500,
      origin_longitude: 106.8272,
      origin_latitude: -6.1754,
    });
    const intent = resolveGlobalSearchIntent(query, regions);
    expect(intent.constraints.radius).toEqual({ radius_meters: 500 });
    expect(intent.origin).toEqual({
      longitude: 106.8272,
      latitude: -6.1754,
      source: "EXPLICIT_ORIGIN",
    });
  });

  it("delegates to CanonicalMerchantReadService with radiusMeters and origin, returning PostGIS distance", async () => {
    const mockList = vi.fn().mockResolvedValue({
      merchants: [
        {
          id: "m-1",
          name: "Warung Kopi",
          category: "Makanan dan Minuman",
          brand: "Makanan dan Minuman",
          longitude: 106.828,
          latitude: -6.176,
          distanceMeters: 120, // PostGIS proximity
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
      ],
      total: 1,
    });

    vi.spyOn(CanonicalMerchantReadService.prototype, "list").mockImplementation(mockList);

    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any;

    const service = new GlobalSearchService(mockSupabase);
    const query = globalSearchQuerySchema.parse({
      radius_meters: 500,
      origin_longitude: 106.8272,
      origin_latitude: -6.1754,
    });

    const result = await service.search(query);

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({
        radiusMeters: 500,
        origin: { longitude: 106.8272, latitude: -6.1754 },
      }),
    );

    expect(result.merchants).toHaveLength(1);
    expect(result.merchants[0].distanceMeters).toBe(120);
    // PostGIS distance is spatial proximity, NOT walking duration
    expect(result.merchants[0].walkingMinutes).toBeNull();
  });
});
