import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MerchantSourceEvidence,
  normalizeMerchantSources,
} from "@/src/features/merchant-evidence/merchant-source-evidence";
import type { Merchant } from "@/types/getra";

function merchant(overrides: Partial<Merchant>): Merchant {
  return {
    id: "merchant-1",
    name: "Warung Uji",
    category: "Kuliner",
    brand: "Warung Uji",
    longitude: 106.8,
    latitude: -6.2,
    walkingMinutes: null,
    distanceMeters: null,
    accessibilityScore: 80,
    priceLabel: "Hemat",
    openNow: false,
    source: "",
    status: "surveyed",
    updatedAt: "2026-09-12T00:00:00.000Z",
    limitation: "Data uji tampilan.",
    ...overrides,
  };
}

describe("MerchantSourceEvidence", () => {
  it("renders Menu Go evidence from the current sources array", () => {
    const html = renderToStaticMarkup(
      <MerchantSourceEvidence merchant={merchant({ sources: ["MENU_GO"], menu: "Bakso" })} />,
    );
    expect(html).toContain("Sumber data: MENU_GO");
    expect(html).toContain("Menu utama");
    expect(html).toContain("Bakso");
  });

  it("supports the legacy source string without crashing", () => {
    const html = renderToStaticMarkup(
      <MerchantSourceEvidence merchant={merchant({ source: "MENU_GO", menu: "Soto" })} />,
    );
    expect(html).toContain("Sumber data: MENU_GO");
    expect(html).toContain("Soto");
  });

  it.each([
    ["both fields missing", {}],
    ["empty sources", { sources: [] }],
  ])("does not crash when %s", (_label, sourceFields) => {
    const html = renderToStaticMarkup(
      <MerchantSourceEvidence merchant={merchant(sourceFields as Partial<Merchant>)} />,
    );
    expect(html).toContain("Sumber data: Tidak tersedia");
    expect(html).not.toContain("Menu utama");
  });

  it("preserves Premium/MAPID provenance presentation", () => {
    const html = renderToStaticMarkup(
      <MerchantSourceEvidence merchant={merchant({ sources: ["PREMIUM"], provenance: { source_type: "PREMIUM" } })} />,
    );
    expect(html).toContain("Sumber data: PREMIUM");
    expect(html).not.toContain("Menu utama");
  });

  it("does not infer Menu Go for an owner-submitted merchant", () => {
    const value = merchant({ sources: ["OWNER_SUBMITTED"], provenance: { source_type: "OWNER_SUBMITTED" } });
    expect(normalizeMerchantSources(value)).toEqual(["OWNER_SUBMITTED"]);
    const html = renderToStaticMarkup(<MerchantSourceEvidence merchant={value} />);
    expect(html).toContain("Sumber data: OWNER_SUBMITTED");
    expect(html).not.toContain("Menu utama");
  });

  it("combines current and legacy representations without duplicates", () => {
    expect(normalizeMerchantSources(merchant({ sources: ["MENU_GO", "PREMIUM"], source: "MENU_GO + OWNER_SUBMITTED" })))
      .toEqual(["MENU_GO", "PREMIUM", "OWNER_SUBMITTED"]);
  });
});
