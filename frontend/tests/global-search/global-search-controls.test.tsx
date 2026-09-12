import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GlobalSearchControls } from "@/src/features/global-search/components/global-search-controls";

describe("GlobalSearchControls", () => {
  it("renders accessible search, region, status, and search-this-area controls", () => {
    const html = renderToStaticMarkup(
      <GlobalSearchControls
        location={null} locating={false} locationError={null} onLocate={vi.fn()}
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
    expect(html).toContain("Ganti area");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("Cari di area peta ini");
    expect(html).toContain("Filter Pencarian");
    expect(html).toContain("Radius");
    expect(html).toContain('aria-live="polite"');
  });

  it("renders active-location radius controls (500m, 1km, 2km, 5km)", () => {
    const html = renderToStaticMarkup(
      <GlobalSearchControls
        query="kopi"
        regions={[]}
        selectedRegionIds={[]}
        intent={null}
        loading={false}
        error={null}
        total={5}
        mapMoved={false}
        maxBudget=""
        openNow={false}
        maxWalkingMinutes={null}
        location={{ latitude: -6.2, longitude: 106.8, accuracyMeters: 18, capturedAt: "2026-09-12T00:00:00.000Z" }}
        locating={false}
        locationError={null}
        canonicalRadius={500}
        onQueryChange={vi.fn()}
        onSubmit={vi.fn()}
        onClear={vi.fn()}
        onToggleRegion={vi.fn()}
        onSearchThisArea={vi.fn()}
        onMaxBudgetChange={vi.fn()}
        onOpenNowChange={vi.fn()}
        onMaxWalkingMinutesChange={vi.fn()}
        onCanonicalRadiusChange={vi.fn()}
        onLocate={vi.fn()}
      />,
    );
    expect(html).toContain("Lokasi saya");
    expect(html).toContain("500 m");
    expect(html).toContain("1 km");
    expect(html).toContain("2 km");
    expect(html).toContain("5 km");
    expect(html).toContain('aria-pressed="true"');
  });
});
