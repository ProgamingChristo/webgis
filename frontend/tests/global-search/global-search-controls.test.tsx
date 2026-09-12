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

  it("renders Sekitar Saya nearby radius chips (250m, 500m, 1km, 2km) and GPS status", () => {
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
        radiusMeters={500}
        locationStatus="ACTIVE"
        accuracyMeters={18}
        onQueryChange={vi.fn()}
        onSubmit={vi.fn()}
        onClear={vi.fn()}
        onToggleRegion={vi.fn()}
        onSearchThisArea={vi.fn()}
        onMaxBudgetChange={vi.fn()}
        onOpenNowChange={vi.fn()}
        onMaxWalkingMinutesChange={vi.fn()}
        onRadiusChange={vi.fn()}
        onRequestLocation={vi.fn()}
      />,
    );
    expect(html).toContain("Sekitar Saya (Radius UMKM)");
    expect(html).toContain("250 m");
    expect(html).toContain("500 m");
    expect(html).toContain("1 km");
    expect(html).toContain("2 km");
    expect(html).toContain("ACTIVE");
    expect(html).toContain("±18m");
    expect(html).toContain("nearby-radius-chip--active");
  });
});
