import { describe, expect, it, vi } from "vitest";

import {
  CanonicalMerchantReadService,
  mapCanonicalMerchantRow,
} from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

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
  it("sends no spatial eligibility filter for global destination search", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const service = new CanonicalMerchantReadService({ rpc } as any);

    await service.list({ keyword: "donut", limit: 8, offset: 0 });

    expect(rpc).toHaveBeenCalledWith("search_canonical_merchants_v2", expect.objectContaining({
      p_keyword: "donut",
      p_west: null,
      p_south: null,
      p_east: null,
      p_north: null,
      p_region_ids: null,
    }));
  });

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

  it("uses owned legacy open-now evidence and a real price level in public details", () => {
    const result = mapCanonicalMerchantRow({
      ...merchant,
      owner_id: "owner-1",
      publish_status: "PUBLISHED",
      price_level: "sedang",
      opening_hours: { open_now: true },
    }, [], new Map());

    expect(result).toMatchObject({
      openingStatus: "OPEN",
      openNow: true,
      openingHoursLabel: "Buka sekarang · jadwal rinci belum diatur",
      priceLabel: "Sedang",
    });
  });

  it("does not fabricate a price category when price level is empty", () => {
    const result = mapCanonicalMerchantRow({ ...merchant, price_level: null }, [], new Map());
    expect(result?.priceLabel).toBeUndefined();
  });

  it("publishes the latest verified owner profile details and menu catalog", () => {
    const result = mapCanonicalMerchantRow({
      ...merchant,
      owner_id: "owner-1",
      verification_status: "VERIFIED",
      description: "Roti rumahan yang dipanggang setiap pagi.",
      metadata: {
        category_label: "Roti dan Kue",
        phone: "+628123456789",
        facilities: ["Tempat Duduk", "Wi-Fi"],
        payment_methods: ["QRIS", "Tunai"],
        social_media: { instagram: "@bakso.test" },
        public_media: {
          storefront_url: "https://example.test/storefront.jpg",
          logo_url: "https://example.test/logo.jpg",
        },
        menu_items: [{
          id: "menu-1",
          name: "Roti Susu",
          price: 12_000,
          description: "Lembut dan hangat",
          photo_url: "https://example.test/roti.jpg",
          is_available: true,
          tag: "Terlaris",
        }],
      },
    }, [], new Map());

    expect(result).toMatchObject({
      category: "Roti dan Kue",
      description: "Roti rumahan yang dipanggang setiap pagi.",
      phone: "+628123456789",
      photo: "https://example.test/storefront.jpg",
      logo: "https://example.test/logo.jpg",
      facilities: ["Tempat Duduk", "Wi-Fi"],
      paymentMethods: ["QRIS", "Tunai"],
      socialMedia: { instagram: "@bakso.test" },
      menuItems: [expect.objectContaining({ name: "Roti Susu", price: 12_000 })],
      menuPhotos: ["https://example.test/roti.jpg"],
    });
  });

  it("does not expose editable profile metadata when no owner controls the merchant", () => {
    const result = mapCanonicalMerchantRow({
      ...merchant,
      owner_id: null,
      verification_status: "UNVERIFIED",
      metadata: {
        facilities: ["Private draft"],
        public_media: { storefront_url: "https://example.test/draft.jpg" },
        menu_items: [{ id: "draft", name: "Draft", price: 1, is_available: true }],
      },
    }, [], new Map());

    expect(result?.photo).toBeUndefined();
    expect(result?.facilities).toBeUndefined();
    expect(result?.menuItems).toBeUndefined();
  });
});
