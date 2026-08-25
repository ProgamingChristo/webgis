import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingHeader } from "../components/landing-header";

describe("LandingHeader", () => {
  it("renders GETRA brand, valid phase-one links, and no dead future links", () => {
    const html = renderToStaticMarkup(createElement(LandingHeader));

    expect(html).toContain("GETRA");
    expect(html).toContain("Geo-Enabled Transit &amp; Retail Analytics");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#tentang"');
    expect(html).toContain('href="#cara-kerja"');
    expect(html).toContain('href="#fitur"');
    expect(html).toContain('href="#umkm"');
    expect(html).toContain('href="#teknologi"');
    expect(html).toContain('aria-controls="landing-mobile-menu"');
    expect(html).not.toContain("#dead");
  });
});
