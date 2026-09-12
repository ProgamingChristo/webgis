import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getraApiGet: vi.fn(), searchCanonicalMerchants: vi.fn() }));
vi.mock("@/src/lib/api/client", () => ({ getraApiGet: mocks.getraApiGet }));
vi.mock("@/src/services/mapid-layer.service", () => ({
  mapidLayerService: { searchCanonicalMerchants: mocks.searchCanonicalMerchants },
}));

import { resolveGetraPlace } from "@/src/features/ai-orchestration/place-resolver";

describe("GETRA deterministic place resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getraApiGet.mockImplementation((path: string) => Promise.resolve(
      path === "/api/places/resolve" ? { data: { candidates: [] } } : { items: [] },
    ));
    mocks.searchCanonicalMerchants.mockResolvedValue({ merchants: [] });
  });

  it("resolves JPO Blok E from canonical transport data with GIS coordinate order", async () => {
    const result = await resolveGetraPlace("JPO Blok E", [{
      id: "node-jpo-e",
      name: "JPO Blok E",
      geometry: { type: "Point", coordinates: [106.80123, -6.19234] },
    }]);
    expect(result).toEqual({
      status: "RESOLVED",
      place: {
        id: "node-jpo-e",
        label: "JPO Blok E",
        coordinate: { longitude: 106.80123, latitude: -6.19234 },
      },
    });
    expect(mocks.searchCanonicalMerchants).not.toHaveBeenCalled();
  });

  it("returns ambiguity instead of silently choosing a similarly named place", async () => {
    const result = await resolveGetraPlace("Blok E", [
      { id: "1", name: "JPO Blok E", geometry: { type: "Point", coordinates: [106.8, -6.2] } },
      { id: "2", name: "Halte Blok E", geometry: { type: "Point", coordinates: [106.81, -6.21] } },
    ]);
    expect(result).toMatchObject({ status: "AMBIGUOUS" });
  });

  it("does not fabricate a coordinate when no GETRA place exists", async () => {
    await expect(resolveGetraPlace("tempat yang tidak ada", [])).resolves.toEqual({ status: "NOT_FOUND" });
  });

  it("resolves a transport node outside the dashboard's initial page", async () => {
    mocks.getraApiGet.mockResolvedValue({
      items: [{ id: "node-jpo-e", name: "JPO Blok E", geometry: { type: "Point", coordinates: [106.80123, -6.19234] } }],
    });

    await expect(resolveGetraPlace("JPO Blok E", [])).resolves.toMatchObject({
      status: "RESOLVED",
      place: { id: "node-jpo-e", coordinate: { longitude: 106.80123, latitude: -6.19234 } },
    });
    expect(mocks.searchCanonicalMerchants).not.toHaveBeenCalled();
  });

  it("uses bounded backend geocoding without inventing coordinates", async () => {
    mocks.getraApiGet.mockImplementation((path: string) => Promise.resolve(
      path === "/api/places/resolve"
        ? { data: { candidates: [{ id: "osm-node-1", label: "JPO Blok E", latitude: -6.1846856, longitude: 106.8148915 }] } }
        : { items: [] },
    ));

    await expect(resolveGetraPlace("JPO Blok E", [])).resolves.toMatchObject({
      status: "RESOLVED",
      place: { label: "JPO Blok E", coordinate: { latitude: -6.1846856, longitude: 106.8148915 } },
    });
  });
});
