import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingPage } from "../components/landing-page";

describe("LandingPage", () => {
  it("renders a public landing page instead of the authenticated dashboard or login form", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Why GETRA exists");
    expect(html).toContain("Distance ≠ Access");
    expect(html).toContain("Demand &amp; Supply Terpisah");
    expect(html).toContain("Popularitas ≠ Relevansi");
    expect(html).toContain("Data Membutuhkan Freshness");
    expect(html).not.toContain("Masuk ke GETRA</h2>");
    expect(html).not.toContain("workspace-grid");
    expect(html).not.toContain("/api/admin");
    expect(html).not.toContain("/api/umkm");
  });

  it("renders the complete Phase 02 product story sections", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    [
      "What is GETRA?",
      "GIS menghitung. AI menginterpretasikan.",
      "Interactive feature experience",
      "Fair Discovery",
      "GETRA WebGIS",
      "GETRA for commuters",
      "GETRA Community",
      "GETRA for UMKM",
      "Add UMKM to GETRA",
      "Advertising Manager",
      "Business Space Intelligence",
      "Trusted Spatial Data",
      "Technology",
      "Start using GETRA",
      "MAPID 2025 / 2026 competition context",
    ].forEach((text) => expect(html).toContain(text));
  });

  it("keeps Fair Discovery, UMKM, analytics, business space, and data trust copy safe", () => {
    const html = renderToStaticMarkup(createElement(LandingPage));

    expect(html).toContain("Original");
    expect(html).toContain("Hidden Gem");
    expect(html).toContain("Sponsored");
    expect(html).toContain("Sponsored harus tetap lolos constraint");
    expect(html).toContain("UMKM adalah stakeholder mode, bukan auth role");
    expect(html).toContain("Merchant ownership diverifikasi terpisah");
    expect(html).toContain("Impressions");
    expect(html).toContain("Sponsored Pin Clicks");
    expect(html).toContain("Profile Opens");
    expect(html).toContain("Route Requests");
    expect(html).toContain("No investment guarantee");
    expect(html).toContain("Source");
    expect(html).toContain("Timestamp / Freshness");
    expect(html).toContain("Verification");
    expect(html).toContain("Provenance");
    expect(html).not.toContain("Revenue");
    expect(html).not.toContain("ROI");
    expect(html).not.toContain("ROAS");
    expect(html).not.toContain("Sales");
    expect(html).not.toContain("UMKM auth role");
  });
});
