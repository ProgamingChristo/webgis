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
  it("renders a data-safe onboarding map illustration instead of a UI screenshot", () => {
    const html = renderToStaticMarkup(createElement(GetraMapScreenshot));

    expect(html).toContain("Peta onboarding GETRA");
    expect(html).toContain("Peta onboarding");
    expect(html).toContain("<svg");
    expect(html).not.toContain("figma-map-showcase.png");
    expect(html).not.toContain("figma-city-map.png");
  });

  it("renders the final public footer with working routes and anchors", () => {
    const html = renderToStaticMarkup(createElement(LandingFooter));

    [
      "GETRA",
      "Peta Transit dan Usaha",
      "Data lokasi menghitung",
      "Asisten menjelaskan",
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
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("Menu");
    expect(html).toContain("Masuk");
  });

  it("renders skip link, onboarding map, final footer, and no dead placeholder links on the page", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Lewati ke konten utama");
    expect(html).toContain('href="#main-content"');
    expect(html).toContain("getra-onboarding-map");
    expect(html).not.toContain("figma-city-map.png");
    expect(html).not.toContain("figma-map-showcase.png");
    expect(html).toContain('href="#faq"');
    expect(html).toContain("Halaman pengenalan ini memakai data contoh");
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
