import { describe, expect, it } from "vitest";

import { toBoundaryFeature } from "@/src/features/administrative-boundaries/administrative-boundary.service";

describe("administrative boundary GeoJSON normalization", () => {
  it.each([
    ["Polygon", [[[106.7, -6.4], [106.9, -6.4], [106.9, -6.2], [106.7, -6.4]]]],
    ["MultiPolygon", [[[[106.7, -6.4], [106.9, -6.4], [106.9, -6.2], [106.7, -6.4]]]]],
  ] as const)("accepts trusted %s EPSG:4326 geometry", (type, coordinates) => {
    const feature = toBoundaryFeature({
      id: "jakarta-selatan",
      name: "Jakarta Selatan",
      region_type: "CITY",
      geometry: { type, coordinates },
    });
    expect(feature.geometry.type).toBe(type);
    expect(feature.properties.bounds).toEqual({
      west: 106.7,
      south: -6.4,
      east: 106.9,
      north: -6.2,
    });
  });

  it("rejects malformed or out-of-range geometry", () => {
    expect(() => toBoundaryFeature({
      id: "jakarta-selatan",
      name: "Jakarta Selatan",
      region_type: "CITY",
      geometry: { type: "MultiPolygon", coordinates: [[[[206.7, -6.4]]]] },
    })).toThrow("EPSG:4326");
  });
});
