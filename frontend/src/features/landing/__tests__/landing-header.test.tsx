import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingHeader } from "../components/landing-header";

describe("LandingHeader", () => {
  it("renders the Figma-aligned GETRA brand, valid links, and no dead future links", () => {
    const html = renderToStaticMarkup(createElement(LandingHeader));

    expect(html).toContain("GETRA");
    expect(html).toContain("getra-figma-mark.svg");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#tentang"');
    expect(html).toContain('href="#cara-kerja"');
    expect(html).toContain('href="#fitur"');
    expect(html).toContain('href="#umkm"');
    expect(html).toContain('href="#teknologi"');
    expect(html).toContain('href="#faq"');
    expect(html).toContain('aria-controls="landing-mobile-menu"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("#dead");
  });
});
