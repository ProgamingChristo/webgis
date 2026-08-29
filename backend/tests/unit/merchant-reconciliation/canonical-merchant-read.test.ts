import { describe, expect, it } from "vitest";

import { mapCanonicalMerchantRow } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

const merchant = {
  id: "canonical-1",
  name: "Bakso Pak Budi",
  description: "Restaurant",
  location: { type: "Point", coordinates: [106.827, -6.175] },
  address: "Jl. Merdeka 1",
  price_level: null,
  opening_hours: { open_now: true },
  is_mobile: false,
  verification_status: "SURVEYED",
  publish_status: "PUBLISHED",
  data_quality_score: 90,
  metadata: {
    brand: "Bakso Pak Budi",
    category: "Restaurant",
    phone: "+62 812 3456 7890",
  },
  updated_at: "2026-08-27T00:00:00.000Z",
};

const links = [
  {
    source_table: "mapid_premium_merchants",
    source_record_id: "premium-1",
  },
  {
    source_table: "mapid_mission_observations:MENU_GO",
    source_record_id: "menu-1",
  },
];

describe("canonical merchant attribute resolution", () => {
  it("keeps Premium identity fields and enriches observational Menu Go fields", () => {
    const observations = new Map([["menu-1", {
      observed_at: "2026-08-26T00:00:00.000Z",
      normalized_properties: {
        foto_tempat: "https://example.test/place.jpg",
        foto_menu_1: "https://example.test/menu.jpg",
        harga_rata_rata: "15-25",
        kondisi_tempat: "RAMAI",
        menu_utama: "Bakso urat",
        mobilitas: "Tidak (Menetap/Mangkal di satu titik)",
      },
    }]]);

    const result = mapCanonicalMerchantRow(merchant, links, observations);
    expect(result).toMatchObject({
      address: "Jl. Merdeka 1",
      phone: "+62 812 3456 7890",
      photo: "https://example.test/place.jpg",
      menu: "Bakso urat",
      observedPrice: "15-25",
      observedCondition: "RAMAI",
      sources: ["PREMIUM", "MENU_GO"],
    });
    expect(result?.provenance).toMatchObject({
      attributes: {
        address: "PREMIUM_OR_CANONICAL",
        menu: "MENU_GO",
        observed_price: "MENU_GO",
        phone: "PREMIUM",
        photo: "MENU_GO",
      },
    });
  });

  it("does not fabricate missing optional fields", () => {
    const result = mapCanonicalMerchantRow(
      { ...merchant, address: null, metadata: {} },
      [links[0]],
      new Map(),
    );
    expect(result?.address).toBeUndefined();
    expect(result?.phone).toBeUndefined();
    expect(result?.photo).toBeUndefined();
    expect(result?.menu).toBeUndefined();
    expect(result?.observedPrice).toBeUndefined();
  });
});
