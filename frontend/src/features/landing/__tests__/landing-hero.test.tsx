import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingHero } from "../components/landing-hero";
import {
  LANDING_MAP_FIXTURE,
  toPointFeatureCollection,
} from "../utils/landing-map.utils";

describe("LandingHero", () => {
  it("communicates GETRA, the GIS/AI boundary, and the primary CTA", () => {
    const html = renderToStaticMarkup(createElement(LandingHero));

    expect(html).toContain("Spatial Intelligence Platform");
    expect(html).toContain("Geo-Enabled");
    expect(html).toContain("Transit &amp; Retail");
    expect(html).toContain("Spatial intelligence untuk menghubungkan");
    expect(html).toContain("GIS menghitung.");
    expect(html).toContain("AI menginterpretasikan.");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#tentang"');
    expect(html).toContain("Belum memiliki akun?");
  });

  it("uses deterministic illustrative map data without campaign attribution", () => {
    const points = toPointFeatureCollection(LANDING_MAP_FIXTURE);
    const serialized = JSON.stringify(points);

    expect(points.features).toHaveLength(4);
    expect(serialized).toContain("transit");
    expect(serialized).toContain("hidden-gem");
    expect(serialized).toContain("sponsored");
    expect(serialized).not.toContain("campaign");
    expect(serialized).not.toContain("impression");
  });
});
