import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingHero } from "../components/landing-hero";
import {
  LANDING_MAP_FIXTURE,
  toPointFeatureCollection,
} from "../utils/landing-map.utils";

describe("LandingHero", () => {
  it("communicates the Figma-aligned city exploration value and primary CTA", () => {
    const html = renderToStaticMarkup(createElement(LandingHero));

    expect(html).toContain("WebGIS untuk mobilitas dan UMKM");
    expect(html).toContain("Jelajahi Kota Lebih Mudah.");
    expect(html).toContain("Temukan Tempat, Rute, dan Usaha Lokal.");
    expect(html).toContain("GETRA membantu Anda mencari tempat");
    expect(html).toContain("getra-onboarding-map");
    expect(html).toContain("Peta onboarding GETRA");
    expect(html).not.toContain("figma-city-map.png");
    expect(html).toContain("Buka GETRA");
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#cara-kerja"');
    expect(html).toContain("Belum punya akun?");
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
