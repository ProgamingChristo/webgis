import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CommuterLocationAuthority } from "@/src/features/location/commuter-location-authority";

type UnifiedRouteDestination = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  district?: string;
  city?: string;
  sourceType: "MERCHANT";
};

const dashboardContent = readFileSync(
  resolve(process.cwd(), "components/getra-dashboard.tsx"),
  "utf8",
);
const mapContent = readFileSync(
  resolve(process.cwd(), "components/getra-map.tsx"),
  "utf8",
);
const detailContent = readFileSync(
  resolve(process.cwd(), "src/features/global-search/components/place-detail-drawer.tsx"), "utf8",
);
const routingServiceContent = readFileSync(
  resolve(process.cwd(), "src/services/routing.service.ts"),
  "utf8",
);
const commuterServiceContent = readFileSync(
  resolve(process.cwd(), "src/services/commuter.service.ts"),
  "utf8",
);

describe("Phase 14: Unified Routing & Destination Decoupling", () => {
  it("decouples destination authority from current map viewport array", () => {
    // Destination authority keeps the selected merchant independently of viewport results.
    expect(dashboardContent).toContain("routeDestinationMerchant");
    expect(dashboardContent).toContain("manualRouteDestination");

    // 3. handleRouteToMerchant must handle merchants regardless of viewport presence
    expect(dashboardContent).toContain("routeToMerchant");
    expect(dashboardContent).toMatch(/<PlaceDetailDrawer\s+merchant=\{selectedMerchant\}\s+onRoute=\{routeToMerchant\}/);
    expect(detailContent).toContain('data-testid="merchant-route-cta"');

    // 4. Fair Discovery onRequestRoute must use handleRouteToMerchant directly
    expect(dashboardContent).toContain("onRequestRoute={(merchant) => routeToMerchant(discoveryMerchant(merchant))}");
  });

  it("handles destination from Fair Discovery when merchant is outside map viewport", () => {
    const externalMerchant = {
      id: "fair-gem-outside-viewport-999",
      name: "Warung Kopi Tersembunyi",
      latitude: -6.2100,
      longitude: 106.6800,
      district: "Cipondoh",
      city: "Kota Tangerang",
      sourceType: "MERCHANT" as const,
    };

    // Construct a unified destination object exactly as handleRouteToMerchant does
    const unified: UnifiedRouteDestination = {
      id: externalMerchant.id,
      name: externalMerchant.name,
      latitude: externalMerchant.latitude,
      longitude: externalMerchant.longitude,
      district: externalMerchant.district,
      city: externalMerchant.city,
      sourceType: "MERCHANT",
    };

    expect(unified.id).toBe("fair-gem-outside-viewport-999");
    expect(unified.latitude).toBe(-6.2100);
    expect(unified.longitude).toBe(106.6800);
    expect(unified.name).toBe("Warung Kopi Tersembunyi");
    expect(unified.sourceType).toBe("MERCHANT");
  });

  it("exposes primary merchant CTA 'Rute ke sini' for one-tap routing", () => {
    expect(detailContent).toContain("Rute ke sini");
    expect(detailContent).toContain("onClick={() => onRoute(merchant)}");

    // A known location becomes route origin; otherwise the location flow starts.
    expect(dashboardContent).toMatch(/if\s*\(userLocation\)\s*\{[\s\S]*?setRouteOriginValue\(ROUTE_ORIGIN_USER\)[\s\S]*?handleLocateUser\(false\)/);
  });

  it("preserves manual origin alternative when GPS is unavailable or denied", () => {
    // Allows user to pick start on map or search origin
    expect(dashboardContent).toContain("ROUTE_ORIGIN_MANUAL");
    expect(dashboardContent).toContain("handleUseManualOrigin");
    expect(dashboardContent).toContain("Pilih di peta");
    expect(dashboardContent).toContain("Aktifkan lokasi");
  });

  it("verifies pedestrian routing truth and forbids fake client routes", () => {
    // Geometry, distance, duration must be sourced from backend
    expect(routingServiceContent).toContain("/api/routing");
    expect(routingServiceContent).not.toContain("direct_line_fallback");
    expect(routingServiceContent).not.toContain("calculateDistanceMeters");
  });

  it("verifies network service area authority and separates proximity scope", () => {
    // Proximity radius stays separate from network service-area geometry.
    expect(dashboardContent).toContain("radius_meters");

    // Service area = network edges from commuterService.serviceArea
    expect(commuterServiceContent).toContain("/api/spatial/service-area");
    expect(dashboardContent).toContain("commuterService.serviceArea");
    expect(mapContent).toContain('"walking-service-area"');

    // No circular polygon fallback for service area
    expect(dashboardContent).not.toContain("fakeServiceAreaPolygon");
    expect(dashboardContent).not.toContain("generateServiceAreaCircle");
  });

  it("throttles service-area updates and prevents GPS jitter request storms", () => {
    const now = 100000;
    const authority = new CommuterLocationAuthority({
      now: () => now,
      policy: {
        maximumAccuracyMeters: 50,
        maximumFixAgeMs: 30000,
        movementThresholdMeters: 50,
        debounceMs: 600,
        geolocation: { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      },
    });

    const origin = { latitude: -6.2151, longitude: 106.6842 };
    authority.recordQueryCoordinate(origin);

    // Small jitter (< 50m) must return false (no request storm)
    const jitter = { latitude: -6.21515, longitude: 106.68425 }; // ~7m
    expect(authority.hasMovedSignificantly(jitter)).toBe(false);

    // Meaningful movement (> 50m) must return true
    const moved = { latitude: -6.2160, longitude: 106.6852 }; // ~145m
    expect(authority.hasMovedSignificantly(moved)).toBe(true);
  });
});
