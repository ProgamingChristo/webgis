import { describe, expect, it } from "vitest";

import { globalSearchQuerySchema } from "@/src/features/global-search/global-search.schema";
import { extractRegionFromQuery } from "@/src/features/global-search/global-search-regions";
import { resolveGlobalSearchIntent } from "@/src/features/global-search/global-search.service";
import type { SearchRegion } from "@/src/features/global-search/global-search.types";

const regions: SearchRegion[] = [
  {
    id: "jakarta-barat",
    name: "Jakarta Barat",
    aliases: ["jakarta barat", "jakbar"],
    bounds: { west: 106.68, south: -6.25, east: 106.83, north: -6.08 },
    geometry_source: "GADM v4.0",
  },
  {
    id: "jakarta-selatan",
    name: "Jakarta Selatan",
    aliases: ["jakarta selatan", "jaksel"],
    bounds: { west: 106.73, south: -6.37, east: 106.88, north: -6.2 },
    geometry_source: "GADM v4.0",
  },
  {
    id: "jakarta-timur",
    name: "Jakarta Timur",
    aliases: ["jakarta timur", "jaktim"],
    bounds: { west: 106.83, south: -6.37, east: 106.98, north: -6.15 },
    geometry_source: "GADM v4.0",
  },
];

const viewport = {
  west: 106.7,
  south: -6.3,
  east: 106.9,
  north: -6.1,
};

function query(input: Record<string, unknown>) {
  return globalSearchQuerySchema.parse({
    q: "",
    scope: "CURRENT_VIEWPORT",
    region_ids: [],
    limit: 50,
    offset: 0,
    ...viewport,
    ...input,
  });
}

describe("global search intent", () => {
  it("keeps global merchant eligibility independent from two different viewports", () => {
    const nearViewport = resolveGlobalSearchIntent(query({
      q: "donut",
      scope: "GLOBAL",
    }), regions);
    const distantViewport = resolveGlobalSearchIntent(query({
      q: "DONUT",
      scope: "GLOBAL",
      west: 107.2,
      south: -6.8,
      east: 107.4,
      north: -6.6,
    }), regions);

    expect(nearViewport).toMatchObject({
      keyword: "donut",
      scope: { type: "GLOBAL", region_ids: [] },
    });
    expect(distantViewport).toMatchObject({
      keyword: "donut",
      scope: { type: "GLOBAL", region_ids: [] },
    });
    expect(distantViewport.scope.bounds).toEqual(nearViewport.scope.bounds);
  });

  it("uses current viewport for keyword-only search", () => {
    const result = resolveGlobalSearchIntent(query({ q: "  Bakso  " }), regions);
    expect(result.keyword).toBe("bakso");
    expect(result.scope).toMatchObject({ type: "CURRENT_VIEWPORT", region_ids: [] });
  });

  it("resolves location-only and aliases deterministically", () => {
    expect(extractRegionFromQuery("Jaksel")?.region.id).toBe("jakarta-selatan");
    const result = resolveGlobalSearchIntent(query({ q: "Jakarta Selatan" }), regions);
    expect(result.keyword).toBeNull();
    expect(result.location_text).toBe("Jakarta Selatan");
    expect(result.scope.type).toBe("REGION");
  });

  it("lets query location override current viewport and selected scope", () => {
    const result = resolveGlobalSearchIntent(query({
      q: "bakso Jakarta Selatan",
      scope: "REGION",
      region_ids: ["jakarta-barat"],
    }), regions);
    expect(result.keyword).toBe("bakso");
    expect(result.scope.region_ids).toEqual(["jakarta-selatan"]);
  });

  it("supports a bounded, deduplicated multi-region contract", () => {
    const result = resolveGlobalSearchIntent(query({
      q: "bakso",
      scope: "MULTI_REGION",
      region_ids: ["jakarta-barat", "jakarta-timur", "jakarta-selatan"],
    }), regions);
    expect(result.scope.type).toBe("MULTI_REGION");
    expect(result.scope.region_ids).toHaveLength(3);
    expect(result.scope.bounds.west).toBe(106.68);
    expect(result.scope.bounds.east).toBe(106.98);
  });

  it("rejects an explicit unknown location instead of inventing coordinates", () => {
    expect(() => resolveGlobalSearchIntent(query({
      q: "bakso",
      location_text: "Atlantis",
    }), regions)).toThrow("Lokasi tidak ditemukan");
  });
});
