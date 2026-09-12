import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { JourneyControls } from "@/src/features/routing/components/journey-controls";
import type { JourneyController, JourneySnapshot } from "@/src/features/routing/journey-controller";

const controller = {
  focus: vi.fn(),
  refresh: vi.fn(),
  stop: vi.fn(),
  toggleNearbyUmkm: vi.fn(),
} as unknown as JourneyController;

const snapshot: JourneySnapshot = {
  state: "ACTIVE",
  engaged: true,
  position: {
    latitude: -6.21,
    longitude: 106.68,
    accuracyMeters: 8,
    capturedAt: "2026-09-12T00:00:00.000Z",
    headingDegrees: 90,
    speedMps: 1.5,
    timestamp: Date.parse("2026-09-12T00:00:00.000Z"),
  },
  route: {
    route_status: "ROUTABLE",
    mode: "walking",
    reason_code: null,
    analysis_method: "navigation_route",
    distance_meters: 450,
    duration_seconds: 338,
    geometry: { type: "LineString", coordinates: [[106.68, -6.21], [106.69, -6.22]] },
    maneuvers: [{ instruction: "Lurus", distance_meters: 120, time_seconds: 80, type: 1 }],
    engine: "valhalla",
    warnings: [],
    has_toll: false,
    has_highway: false,
    has_ferry: false,
    limitation_flags: [],
    route_source: "valhalla",
    source: "OPENSTREETMAP",
  },
  error: null,
  authRequired: false,
  following: true,
  updatedAt: Date.parse("2026-09-12T00:00:00.000Z"),
  routeKey: "route",
  focusKey: 1,
  gpsState: "GPS_GOOD",
  gpsAccuracyMeters: 8,
  routeStale: false,
  routeMatch: "ON_ROUTE",
  progressFraction: 0.25,
  distanceFromRouteMeters: 4,
  nearbyUmkmVisible: false,
};

describe("active journey navigation card", () => {
  it("prioritizes deterministic remaining metrics and navigation actions", () => {
    const html = renderToStaticMarkup(<JourneyControls
      journey={{ ...snapshot, controller }} canStart={false} onStart={vi.fn()}
      destinationName="Bakso Tujuan" mode="walking" onModeChange={vi.fn()}
    />);
    expect(html).toContain("450 m");
    expect(html).toContain("sisa jarak");
    expect(html).toContain("sisa waktu");
    expect(html).toContain("Fokuskan");
    expect(html).toContain("Tampilkan UMKM sekitar");
    expect(html).toContain("Akhiri Perjalanan");
    expect(html).toContain('data-route-match="ON_ROUTE"');
    expect(html.match(/data-testid="routing-result"/g)).toHaveLength(1);
  });

  it("exposes explicit nearby state without creating a second route result", () => {
    const html = renderToStaticMarkup(<JourneyControls
      journey={{ ...snapshot, nearbyUmkmVisible: true, controller }} canStart={false} onStart={vi.fn()}
      nearbyUmkmCount={3}
    />);
    expect(html).toContain("UMKM sekitar (3)");
    expect(html).toContain('data-nearby-umkm="true"');
    expect(html.match(/data-testid="routing-result"/g)).toHaveLength(1);
  });
});
