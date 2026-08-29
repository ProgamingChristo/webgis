import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GlobalSearchControls } from "@/src/features/global-search/components/global-search-controls";

describe("GlobalSearchControls", () => {
  it("renders accessible search, region, status, and search-this-area controls", () => {
    const html = renderToStaticMarkup(
      <GlobalSearchControls
        query="bakso"
        regions={[{
          id: "jakarta-selatan",
          name: "Jakarta Selatan",
          aliases: ["jaksel"],
          bounds: { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
          geometry_source: "GADM v4.0",
        }]}
        selectedRegionIds={["jakarta-selatan"]}
        intent={{
          domain: "MERCHANT",
          original_query: "bakso Jakarta Selatan",
          keyword: "bakso",
          location_text: "Jakarta Selatan",
          category: null,
          scope: {
            type: "REGION",
            region_ids: ["jakarta-selatan"],
            bounds: { west: 106.7, south: -6.3, east: 106.9, north: -6.1 },
          },
          constraints: { budget: null, opening: null, walking: null },
          origin: null,
          parser: "DETERMINISTIC",
          confidence: "HIGH",
        }}
        loading={false}
        error={null}
        total={8}
        mapMoved
        maxBudget="30000"
        openNow={false}
        maxWalkingMinutes={10}
        onQueryChange={vi.fn()}
        onSubmit={vi.fn()}
        onClear={vi.fn()}
        onToggleRegion={vi.fn()}
        onSearchThisArea={vi.fn()}
        onMaxBudgetChange={vi.fn()}
        onOpenNowChange={vi.fn()}
        onMaxWalkingMinutesChange={vi.fn()}
      />,
    );
    expect(html).toContain('id="global-search-query"');
    expect(html).toContain("Cakupan wilayah");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("Cari di area ini");
    expect(html).toContain('aria-live="polite"');
  });
});
