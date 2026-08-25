import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getraLogo, GetraLogo } from "../components/getra-logo";
import { LandingFooter } from "../components/landing-footer";
import { LandingHeader } from "../components/landing-header";

describe("Landing Phase 04 official branding", () => {
  it("exposes the official GETRA logo asset with stable metadata", () => {
    const assetPath = path.join(process.cwd(), "public/brand/getra-logo.png");

    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.statSync(assetPath).size).toBeGreaterThan(10_000);
    expect(fs.statSync(assetPath).size).toBeLessThan(180_000);
    expect(getraLogo).toEqual({
      alt: "GETRA — Geo-Enabled Transit & Retail Analytics",
      height: 173,
      src: "/brand/getra-logo.png",
      width: 486,
    });
  });

  it("renders the official logo through Next Image with accessible alt text", () => {
    const html = renderToStaticMarkup(createElement(GetraLogo));

    expect(html).toContain("url=%2Fbrand%2Fgetra-logo.png");
    expect(html).toContain("GETRA — Geo-Enabled Transit &amp; Retail Analytics");
    expect(html).toContain('width="486"');
    expect(html).toContain('height="173"');
  });

  it("replaces provisional header and footer marks with the official logo", () => {
    const html = [
      renderToStaticMarkup(createElement(LandingHeader)),
      renderToStaticMarkup(createElement(LandingFooter)),
    ].join("\n");

    expect(html).toContain("url=%2Fbrand%2Fgetra-logo.png");
    expect(html).toContain('aria-label="GETRA home"');
    expect(html).toContain("GETRA — Geo-Enabled Transit &amp; Retail Analytics");
    expect(html).not.toContain(">G</span>");
  });
});
