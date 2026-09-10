import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getraLogo, GetraLogo } from "../components/getra-logo";
import { LandingFooter } from "../components/landing-footer";
import { LandingHeader } from "../components/landing-header";

describe("Landing branding", () => {
  it("keeps the official GETRA logo asset available with stable metadata", () => {
    const assetPath = path.join(process.cwd(), "public/brand/getra-logo.png");

    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.statSync(assetPath).size).toBeGreaterThan(10_000);
    expect(fs.statSync(assetPath).size).toBeLessThan(180_000);
    expect(getraLogo).toMatchObject({
      height: 173,
      src: "/brand/getra-logo.png",
      width: 486,
    });
    expect(getraLogo.alt).toContain("GETRA");
    expect(getraLogo.alt).toContain("Peta Transit dan Usaha");
  });

  it("renders the official logo through Next Image with accessible alt text", () => {
    const html = renderToStaticMarkup(createElement(GetraLogo));

    expect(html).toContain("url=%2Fbrand%2Fgetra-logo.png");
    expect(html).toContain(getraLogo.alt);
    expect(html).toContain('width="486"');
    expect(html).toContain('height="173"');
  });

  it("uses the Figma-aligned brand mark in the header and footer", () => {
    const html = [
      renderToStaticMarkup(createElement(LandingHeader)),
      renderToStaticMarkup(createElement(LandingFooter)),
    ].join("\n");

    expect(html).toContain("getra-figma-mark.svg");
    expect(html).toContain('aria-label="GETRA home"');
    expect(html).toContain("Peta Cerdas Kota");
    expect(html).not.toContain(">G</span>");
  });
});
