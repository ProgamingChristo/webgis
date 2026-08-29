import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RegionScopeSummary } from "@/src/features/administrative-boundaries/components/region-scope-summary";

describe("RegionScopeSummary", () => {
  it("renders textual selection and accessible chip removal", () => {
    const html = renderToStaticMarkup(
      <RegionScopeSummary
        selectedRegionIds={["jakarta-barat", "jakarta-selatan"]}
        regions={[
          { id: "jakarta-barat", name: "Jakarta Barat", aliases: [], bounds: { west: 0, south: 0, east: 1, north: 1 }, geometry_source: "trusted" },
          { id: "jakarta-selatan", name: "Jakarta Selatan", aliases: [], bounds: { west: 0, south: 0, east: 1, north: 1 }, geometry_source: "trusted" },
        ]}
        boundaryLoading={false}
        boundaryError={null}
        onRemove={vi.fn()}
      />,
    );
    expect(html).toContain("2 wilayah dipilih");
    expect(html).toContain('aria-label="Hapus wilayah Jakarta Barat"');
    expect(html).toContain("Boundary dan label wilayah aktif di peta.");
  });
});
