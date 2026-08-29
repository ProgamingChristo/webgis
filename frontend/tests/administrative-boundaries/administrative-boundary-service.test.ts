import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/src/lib/api-client", () => ({ apiClient: { get: apiGet } }));

import { administrativeBoundaryService } from "@/src/features/administrative-boundaries/services/administrative-boundary.service";

describe("administrative boundary browser cache", () => {
  beforeEach(() => apiGet.mockReset());

  it("fetches each selected region once and reuses cached GeoJSON", async () => {
    apiGet.mockResolvedValue({
      feature_count: 1,
      feature_collection: {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          id: "jakarta-utara",
          properties: { id: "jakarta-utara", name: "Jakarta Utara", region_type: "CITY", bounds: { west: 106.7, south: -6.2, east: 107, north: -6 } },
          geometry: { type: "MultiPolygon", coordinates: [] },
        }],
      },
    });
    await administrativeBoundaryService.getByIds(["jakarta-utara"]);
    const second = await administrativeBoundaryService.getByIds(["jakarta-utara"]);
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(second.features).toHaveLength(1);
    expect(apiGet.mock.calls[0]?.[0]).toBe("/api/regions?ids=jakarta-utara");
  });
});
