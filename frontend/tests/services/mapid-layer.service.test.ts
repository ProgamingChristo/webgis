import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("@/src/lib/api-client", () => ({
  apiClient: { get: apiGet },
}));

import { mapidLayerService } from "@/src/services/mapid-layer.service";

describe("mapidLayerService canonical viewport", () => {
  beforeEach(() => apiGet.mockReset());

  it("sends only bbox and bounded pagination to the GETRA API", async () => {
    const controller = new AbortController();
    apiGet.mockResolvedValue({ merchants: [] });

    await mapidLayerService.getCanonicalMerchants(
      { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
      {
        limit: 100,
        offset: 25,
        signal: controller.signal,
        query: "bakso",
        scope: "MULTI_REGION",
        regionIds: ["jakarta-barat", "jakarta-selatan"],
      },
    );

    const [path, options] = apiGet.mock.calls[0] ?? [];
    expect(path).toContain("/api/merchants/canonical?");
    expect(path).toContain("west=106.7");
    expect(path).toContain("limit=100");
    expect(path).toContain("offset=25");
    expect(path).toContain("q=bakso");
    expect(path).toContain("scope=MULTI_REGION");
    expect(path).toContain("region_ids=jakarta-barat%2Cjakarta-selatan");
    expect(options).toEqual({ signal: controller.signal });
    expect(path).not.toContain("mapid");
    expect(path).not.toContain("x-api-key");
  });
});
