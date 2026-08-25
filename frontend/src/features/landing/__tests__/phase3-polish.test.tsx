import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GetraMapScreenshot } from "../components/getra-map-screenshot";
import { LandingFooter } from "../components/landing-footer";
import { LandingHeader } from "../components/landing-header";
import { LandingPage } from "../components/landing-page";

describe("Landing Phase 03 polish", () => {
  it("renders the real GETRA map screenshot component with optimized asset and alt text", () => {
    const html = renderToStaticMarkup(createElement(GetraMapScreenshot));
    const assetPath = path.join(
      process.cwd(),
      "public/images/landing/getra-pedestrian-route-showcase.webp",
    );

    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.statSync(assetPath).size).toBeLessThan(250_000);
    expect(html).toContain("getra-pedestrian-route-showcase.webp");
    expect(html).toContain("Foto penuh peta GETRA");
    expect(html).not.toContain("Test route scenario");
    expect(html).not.toContain("Start point");
  });

  it("renders the final public footer with working routes and anchors", () => {
    const html = renderToStaticMarkup(createElement(LandingFooter));

    [
      "GETRA",
      "Geo-Enabled Transit &amp; Retail Analytics",
      "GIS menghitung",
      "AI menginterpretasikan",
      'href="#tentang"',
      'href="#cara-kerja"',
      'href="#fitur"',
      'href="#umkm"',
      'href="#teknologi"',
      'href="/login"',
      'href="/signup"',
      'href="#top"',
    ].forEach((text) => expect(html).toContain(text));

    expect(html).not.toContain("javascript:void");
    expect(html).not.toContain('href="#"');
  });

  it("keeps header mobile menu controls accessible", () => {
    const html = renderToStaticMarkup(createElement(LandingHeader));

    expect(html).toContain('aria-controls="landing-mobile-menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Menu");
    expect(html).toContain("Masuk");
  });

  it("renders skip link, screenshot, final footer, and no dead placeholder links on the page", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Lewati ke konten utama");
    expect(html).toContain("getra-pedestrian-route-showcase.webp");
    expect(html).toContain("MAPID 2025 / 2026 competition context");
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain("javascript:void");
  });

  it("keeps reduced-motion CSS and landing animation primitives scoped", () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".getra-reveal");
    expect(css).toContain("@keyframes getra-route-draw");
    expect(css).toContain("@keyframes getra-marker-pulse");
    expect(css).toContain(".getra-route-draw");
  });
});
