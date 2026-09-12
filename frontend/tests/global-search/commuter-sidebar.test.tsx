import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { merchantDistance, merchantPrice, MerchantResultRow } from "@/src/features/global-search/components/merchant-result-row";
import { CommuterSidebar } from "@/src/features/global-search/components/commuter-sidebar";
import { PlaceDetailDrawer } from "@/src/features/global-search/components/place-detail-drawer";
import { apiClient } from "@/src/lib/api-client";
import { FairDiscoveryService } from "@/src/features/fair-discovery/services/fair-discovery.service";
import { discoveryMerchant } from "@/src/features/fair-discovery/discovery-merchant";
import type { Merchant } from "@/types/getra";

const merchant: Merchant = {
  id: "test-merchant", name: "Merchant tanpa metadata", category: "Makanan", brand: "Lokal",
  latitude: -6.2, longitude: 106.8, walkingMinutes: 4, distanceMeters: 300,
  accessibilityScore: 94, priceLabel: "Hemat", openNow: true, source: "TEST",
  status: "surveyed", updatedAt: "2026-09-11", limitation: "Test fixture",
};

describe("commuter merchant evidence", () => {
  it("does not treat legacy estimates, price classes or an unknown opening status as facts", () => {
    const html = renderToStaticMarkup(<MerchantResultRow merchant={merchant} selected={false} onSelect={vi.fn()} budget={15000} />);
    expect(merchantPrice(merchant)).toBe("Harga belum tersedia");
    expect(merchantDistance(merchant)).toBeNull();
    expect(html).not.toContain("Buka sekarang");
    expect(html).not.toContain("Masuk anggaran");
    expect(html).not.toContain("4 menit");
    expect(html).not.toContain("94%");
    expect(html).not.toContain("<img");
  });
  it("renders only validated route, numeric price, and opening evidence", () => {
    const valid: Merchant = { ...merchant, openingStatus: "OPEN", observedPriceAmount: 12000,
      networkRouteStatus: "ROUTABLE", networkDurationSeconds: 240, networkDistanceMeters: 300 };
    const html = renderToStaticMarkup(<MerchantResultRow merchant={valid} selected onSelect={vi.fn()} budget={15000} />);
    expect(merchantDistance(valid)).toBe("4 menit · 300 m");
    expect(html).toContain("Rp12.000");
    expect(html).toContain("Buka sekarang");
    expect(html).toContain("Masuk anggaran");
    expect(html).toContain('aria-pressed="true"');
  });
  it("rejects non-finite and zero numeric price evidence", () => {
    for (const observedPriceAmount of [NaN, Infinity, -1, 0]) {
      expect(merchantPrice({ ...merchant, observedPriceAmount })).toBe("Harga belum tersedia");
    }
  });
  it("keeps sponsored disclosure separate from merchant evidence", () => {
    const html = renderToStaticMarkup(<MerchantResultRow merchant={merchant} selected={false} sponsored onSelect={vi.fn()} />);
    expect(html).toContain("Promosi");
    expect(html).toContain('data-status="SPONSORED"');
  });
  it("renders a consumer place detail without internal data tiles or invented menu text", () => {
    const html = renderToStaticMarkup(<PlaceDetailDrawer merchant={{ ...merchant, address: "Jl. Contoh 1", photo: "https://images.example.test/place.jpg" }} onRoute={vi.fn()} />);
    expect(html).toContain("Jl. Contoh 1");
    expect(html).toContain("Rute ke sini");
    expect(html).toContain("Belum ada catatan komunitas untuk tempat ini");
    expect(html).not.toContain("Jam buka belum tersedia");
    expect(html).not.toContain("Harga belum tersedia");
    expect(html).not.toContain("Data GETRA");
    expect(html).not.toContain("Koordinat");
    expect(html).not.toContain("Menu utama");
  });
});

describe("commuter sidebar modes", () => {
  it("retains route controls while search mode hides the planner and exposes its summary", () => {
    const html = renderToStaticMarkup(<CommuterSidebar mode="search" onModeChange={vi.fn()} onCollapse={vi.fn()} route={<span>Route controls</span>}><span>Canonical results</span></CommuterSidebar>);
    expect(html).toContain('<div hidden=""><span>Route controls</span></div>');
    expect(html).toContain("Rute Perjalanan");
    expect(html).toContain("Canonical results");
    expect(html).not.toContain("Asisten");
  });
});


describe("discovery request semantics", () => {
  it("sends a real radius and omits false opening constraints", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({});
    const controller = new AbortController();
    await FairDiscoveryService.discover({ origin: { longitude: 106.75, latitude: -6.17 }, radiusMeters: 500, openNow: false }, { signal: controller.signal });
    const url = new URL(String(get.mock.calls[0][0]), "http://test.local");
    expect(url.searchParams.get("radius_meters")).toBe("500");
    expect(url.searchParams.has("open_now")).toBe(false);
    expect(get.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});


describe("discovery selection identity", () => {
  it("can select a returned merchant outside the canonical viewport without guessed metadata", async () => {
    const result = discoveryMerchant({ id: "outside-viewport", name: "Returned place", category: "UMKM",
      geometry: { type: "Point", coordinates: [107, -6] }, distance_meters: 500,
      walking_minutes: null, open_now: null, route_status: null });
    expect(result.id).toBe("outside-viewport");
    expect(result.longitude).toBe(107);
    expect(result.openingStatus).toBe("UNKNOWN");
    expect(result.observedPriceAmount).toBeUndefined();
    expect(result.priceLabel).toBeUndefined();
    expect(result.status).toBeUndefined();
  });
});
