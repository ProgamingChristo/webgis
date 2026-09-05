import { describe, expect, it, vi } from "vitest";
import { UmkmIntelligenceService } from "@/src/features/umkm-intelligence/umkm-intelligence.service";
import type { UmkmIntelligenceRepository } from "@/src/features/umkm-intelligence/umkm-intelligence.repository";

const merchantId = "11111111-1111-4111-8111-111111111111";

function setup({ metadata, location = { type: "Point", coordinates: [106.8, -6.2] }, observed = {} }: {
  metadata: Record<string, unknown>;
  location?: unknown;
  observed?: Record<string, unknown>;
}) {
  const repository = {
    getMerchant: vi.fn().mockResolvedValue({
      id: merchantId, owner_id: "owner", name: "Usaha 123", description: "Usaha keluarga", address: "Jakarta",
      location, metadata, opening_hours: { monday: { is_closed: false, opens_at: "08:00", closes_at: "18:00" } },
      price_level: null, is_mobile: false, publish_status: "PUBLISHED", verification_status: "VERIFIED", updated_at: "2026-09-01T00:00:00Z",
    }),
    getAccountRole: vi.fn().mockResolvedValue("USER"),
    hasApprovedClaim: vi.fn(),
    getSourceEvidence: vi.fn().mockResolvedValue({ links: [], observations: [{ normalized_properties: observed }] }),
    demand: { get: vi.fn().mockResolvedValue({ rows: [] }) },
    network: { route: vi.fn().mockResolvedValue({ status: "NO_NETWORK_ACCESS" }) },
    listRegions: vi.fn().mockResolvedValue([]),
    listTransit: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  };
  return {
    repository,
    analyze: () => new UmkmIntelligenceService(repository as unknown as UmkmIntelligenceRepository).analyze("owner", { merchant_id: merchantId, days: 30 }),
  };
}

const approvedMetadata = {
  category_label: "Bakso",
  public_media: { storefront_url: "https://example.test/store.jpg", menu_urls: ["https://example.test/menu.jpg"], product_urls: [] },
  business_info: { contact_phone: "081234567890", price_range: "BUDGET", payment_methods: ["QRIS"] },
};

describe("Approved registration profile evidence", () => {
  it("uses the fields persisted by approve_merchant_submission for readiness and category analytics", async () => {
    const { analyze, repository } = setup({ metadata: approvedMetadata });
    const result = await analyze();
    expect(result.merchant).toMatchObject({ category: "Bakso", category_slug: "bakso" });
    for (const id of ["CATEGORY", "PHOTO", "MENU", "PHONE", "PRICE"]) {
      expect(result.data_readiness.components.find((item) => item.id === id)?.status).toBe("AVAILABLE");
    }
    expect(result.data_readiness.score).toBe(100);
    for (const id of ["ADD_PROFILE_PHOTO", "ADD_MENU_EVIDENCE", "ADD_CONTACT", "ADD_PRICE_DATA", "COMPLETE_CATEGORY"]) {
      expect(result.recommendations.map((item) => item.id)).not.toContain(id);
    }
    expect(repository.demand.get).toHaveBeenCalledWith(expect.objectContaining({ category: "bakso" }));
  });

  it("retains reviewed profile evidence when location analysis is unavailable", async () => {
    const { analyze, repository } = setup({ metadata: approvedMetadata, location: null });
    const result = await analyze();
    expect(result.merchant.category).toBe("Bakso");
    expect(result.market_context.status).toBe("UNAVAILABLE");
    expect(result.data_readiness.components.find((item) => item.id === "LOCATION")?.status).toBe("MISSING");
    expect(result.data_readiness.components.find((item) => item.id === "PHOTO")?.status).toBe("AVAILABLE");
    expect(repository.demand.get).not.toHaveBeenCalled();
  });

  it("keeps empty and malformed profile metadata missing", async () => {
    const { analyze } = setup({ metadata: {
      category_label: "Bakso",
      public_media: { storefront_url: " ", product_urls: [null, ""], menu_urls: [] },
      business_info: { contact_phone: " ", price_range: null },
    } });
    const result = await analyze();
    for (const id of ["PHOTO", "MENU", "PHONE", "PRICE"]) {
      expect(result.data_readiness.components.find((item) => item.id === id)?.status).toBe("MISSING");
    }
    expect(result.recommendations.map((item) => item.id)).toEqual(expect.arrayContaining(["ADD_PROFILE_PHOTO", "ADD_MENU_EVIDENCE", "ADD_CONTACT", "ADD_PRICE_DATA"]));
  });

  it("preserves imported source and existing metadata fallbacks", async () => {
    const { analyze } = setup({
      metadata: { phone: "081234567890", public_media: null, business_info: [] },
      observed: { jenis_tempat: "Bakso", foto_tempat: "https://example.test/import.jpg", foto_menu_1: "https://example.test/menu.jpg", harga_rata_rata: "18000" },
    });
    const result = await analyze();
    expect(result.merchant.category_slug).toBe("bakso");
    for (const id of ["CATEGORY", "PHOTO", "MENU", "PHONE", "PRICE"]) {
      expect(result.data_readiness.components.find((item) => item.id === id)?.status).toBe("AVAILABLE");
    }
  });
});
