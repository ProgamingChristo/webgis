import { describe, expect, it } from "vitest";

import {
  calculateCombinedBoundaryBounds,
  groupMerchantsByRegion,
} from "@/src/features/administrative-boundaries/utils/administrative-boundary.utils";

describe("administrative boundary utilities", () => {
  it("calculates combined bounds from selected region geometry metadata", () => {
    expect(calculateCombinedBoundaryBounds({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { id: "a", name: "A", region_type: "CITY", bounds: { west: 106.7, south: -6.3, east: 106.8, north: -6.1 } }, geometry: { type: "Polygon", coordinates: [] } },
        { type: "Feature", properties: { id: "b", name: "B", region_type: "CITY", bounds: { west: 106.8, south: -6.4, east: 107, north: -6.2 } }, geometry: { type: "MultiPolygon", coordinates: [] } },
      ],
    })).toEqual({ west: 106.7, south: -6.4, east: 107, north: -6.1 });
  });

  it("groups in selected order and removes duplicate canonical IDs", () => {
    const merchant = (id: string, regionId: string) => ({ id, regionIds: [regionId] });
    const groups = groupMerchantsByRegion(
      [merchant("one", "timur"), merchant("two", "barat"), merchant("one", "timur")],
      ["barat", "timur"],
      [{ id: "barat", name: "Jakarta Barat" }, { id: "timur", name: "Jakarta Timur" }],
    );
    expect(groups.map((group) => group.name)).toEqual(["Jakarta Barat", "Jakarta Timur"]);
    expect(groups.flatMap((group) => group.merchants)).toHaveLength(2);
  });
});
