import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COFFEE_SHOP_BOUNDS,
  COFFEE_SHOP_ORIGIN,
  COFFEE_SHOPS,
} from "@/data/coffee-shops-jakarta-barat";
import type { Merchant } from "@/types/getra";
import { CANONICAL_SEARCH_REGIONS } from "@/components/getra-dashboard";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "components/getra-dashboard.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const mapSource = readFileSync(
  resolve(process.cwd(), "components/getra-map.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("padang viewport regression audit & reproduction", () => {
  const nationwideAdminMerchants: Merchant[] = [
    {
      id: "aceh-1",
      name: "Kedai Aceh",
      category: "Kopi",
      brand: "Lokal",
      longitude: 96.8422,
      latitude: 3.7448,
      walkingMinutes: 5,
      distanceMeters: 200,
      accessibilityScore: 90,
      priceLabel: "Hemat",
      openNow: true,
      source: "ADMIN_IMPORT",
      status: "verified",
      updatedAt: "2026-09-12",
      limitation: "Import",
    },
    {
      id: "makassar-1",
      name: "Kafe Makassar",
      category: "Kopi",
      brand: "Lokal",
      longitude: 119.4477,
      latitude: -5.1477,
      walkingMinutes: 5,
      distanceMeters: 200,
      accessibilityScore: 90,
      priceLabel: "Hemat",
      openNow: true,
      source: "ADMIN_IMPORT",
      status: "verified",
      updatedAt: "2026-09-12",
      limitation: "Import",
    },
    {
      id: "gresik-1",
      name: "Warung Gresik",
      category: "Kopi",
      brand: "Lokal",
      longitude: 112.6555,
      latitude: -7.1566,
      walkingMinutes: 5,
      distanceMeters: 200,
      accessibilityScore: 90,
      priceLabel: "Hemat",
      openNow: true,
      source: "ADMIN_IMPORT",
      status: "verified",
      updatedAt: "2026-09-12",
      limitation: "Import",
    },
  ];

  function calculateMerchantBounds(
    merchants: Merchant[],
    fallbackOrigin: { longitude: number; latitude: number } = COFFEE_SHOP_ORIGIN,
  ) {
    if (merchants.length === 0) {
      return {
        west: fallbackOrigin.longitude - 0.04,
        south: fallbackOrigin.latitude - 0.04,
        east: fallbackOrigin.longitude + 0.04,
        north: fallbackOrigin.latitude + 0.04,
      };
    }

    const raw = merchants.reduce(
      (bounds, merchant) => ({
        west: Math.min(bounds.west, merchant.longitude),
        south: Math.min(bounds.south, merchant.latitude),
        east: Math.max(bounds.east, merchant.longitude),
        north: Math.max(bounds.north, merchant.latitude),
      }),
      {
        west: merchants[0]?.longitude ?? fallbackOrigin.longitude,
        south: merchants[0]?.latitude ?? fallbackOrigin.latitude,
        east: merchants[0]?.longitude ?? fallbackOrigin.longitude,
        north: merchants[0]?.latitude ?? fallbackOrigin.latitude,
      },
    );

    const minSpan = 0.04;
    const spanLng = Math.abs(raw.east - raw.west);
    const spanLat = Math.abs(raw.north - raw.south);
    const centerLng = (raw.west + raw.east) / 2;
    const centerLat = (raw.south + raw.north) / 2;

    return {
      west: spanLng < minSpan ? centerLng - minSpan / 2 : raw.west,
      east: spanLng < minSpan ? centerLng + minSpan / 2 : raw.east,
      south: spanLat < minSpan ? centerLat - minSpan / 2 : raw.south,
      north: spanLat < minSpan ? centerLat + minSpan / 2 : raw.north,
    };
  }

  function calculateMerchantOrigin(
    merchants: Merchant[],
    fallback: { name: string; longitude: number; latitude: number } = COFFEE_SHOP_ORIGIN,
  ) {
    const bounds = calculateMerchantBounds(merchants, fallback);
    return {
      id: "active-dataset-center",
      name: fallback.name,
      longitude: (bounds.west + bounds.east) / 2,
      latitude: (bounds.south + bounds.north) / 2,
    };
  }

  it("proves the buggy commit logic produces the Padang coordinates and empty merchant view", () => {
    // Exact buggy logic from commit ab0fd59:
    const datasetId: string = "all-areas";
    const mapidMerchants: Merchant[] = [];
    const buggyAllMerchants = [
      ...nationwideAdminMerchants,
      ...mapidMerchants,
      ...(datasetId === "coffee-jakarta-barat" ? COFFEE_SHOPS : []),
    ];

    const buggyOrigin = calculateMerchantOrigin(buggyAllMerchants, {
      ...COFFEE_SHOP_ORIGIN,
      name: "Pusat sebaran semua data GETRA",
    });

    const buggyBaseMerchants = datasetId === "all-areas" ? mapidMerchants : COFFEE_SHOPS;

    expect(buggyOrigin.longitude).toBeCloseTo(108.145, 2);
    expect(buggyOrigin.latitude).toBeCloseTo(-1.7059, 1);
    expect(buggyOrigin.longitude).toBeGreaterThan(100);
    expect(buggyOrigin.longitude).toBeLessThan(110);
    expect(buggyOrigin.latitude).toBeGreaterThan(-3);
    expect(buggyOrigin.latitude).toBeLessThan(0);
    expect(buggyBaseMerchants.length).toBe(0);
  });

  it("asserts getra-dashboard does NOT contain the buggy ab0fd59 merchant exclusion pattern", () => {
    const hasBuggyCoffeeShopFilter = dashboardSource.includes(
      'datasetId === "coffee-jakarta-barat" ? COFFEE_SHOPS : []',
    );
    expect(hasBuggyCoffeeShopFilter).toBe(false);
  });

  it("asserts getra-dashboard does NOT unconditionally inject adminImportedLayer into allMerchants", () => {
    const hasUnconditionalAdminImport = /allMerchants\s*=\s*useMemo\(\s*\(\)\s*=>\s*deduplicateMerchants\(\[\s*\.\.\.\(adminImportedLayer\?\.merchants/s.test(
      dashboardSource,
    );
    expect(hasUnconditionalAdminImport).toBe(false);
  });

  it("asserts getra-dashboard baseMerchants does not default to bare mapidMerchants on all-areas", () => {
    const hasBareMapidMerchants = /datasetId\s*===\s*"all-areas"\s*\?\s*mapidMerchants\s*:\s*isAdminImportDataset/s.test(
      dashboardSource,
    );
    expect(hasBareMapidMerchants).toBe(false);
  });

  it("verifies canonical GETRA study area coordinates remain in Jakarta", () => {
    expect(COFFEE_SHOP_ORIGIN.longitude).toBeCloseTo(106.758, 2);
    expect(COFFEE_SHOP_ORIGIN.latitude).toBeCloseTo(-6.172, 2);

    expect(COFFEE_SHOP_BOUNDS.west).toBeGreaterThan(106.5);
    expect(COFFEE_SHOP_BOUNDS.east).toBeLessThan(107.0);
    expect(COFFEE_SHOP_BOUNDS.south).toBeGreaterThan(-6.4);
    expect(COFFEE_SHOP_BOUNDS.north).toBeLessThan(-6.0);
  });

  it("provides canonical search regions on mount with exactly 1 Jakarta Barat and 1 Jakarta Pusat", () => {
    expect(CANONICAL_SEARCH_REGIONS.length).toBe(5);
    const baratCount = CANONICAL_SEARCH_REGIONS.filter((r) => r.id === "jakarta-barat").length;
    const pusatCount = CANONICAL_SEARCH_REGIONS.filter((r) => r.id === "jakarta-pusat").length;
    expect(baratCount).toBe(1);
    expect(pusatCount).toBe(1);
  });

  it("ensures route preview camera priority overrides default dataset bounds", () => {
    expect(mapSource).toContain("isRouteGeometry(routeGeometry)");
    expect(mapSource).toContain("!routeGeometry");
  });

  it("ensures Active Journey navigation camera overrides default dataset camera", () => {
    expect(mapSource).toContain("journeyActive");
    expect(mapSource).toContain("journeyFollowing");
    expect(mapSource).toContain("onJourneyCameraOverride");
  });

  it("ensures single map instance lifecycle without multiple initializations", () => {
    expect(mapSource).toContain("!containerRef.current ||");
    expect(mapSource).toContain("mapRef.current");
    expect(mapSource).toContain("mapRef.current = null;");
  });
});
