import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RouteUmkmAnalysisService, selectCandidate } from "@/src/features/routing/route-umkm-analysis.service";
import type { NavigationRouteCandidate, NavigationRouteResult } from "@/src/features/routing/routing.types";

const geometry = { type: "LineString" as const, coordinates: [[106.8, -6.2], [106.81, -6.21]] as [[number, number], [number, number]] };
const candidate = (id: string, duration: number, distance: number, count: number): NavigationRouteCandidate => ({
  route_id: id, route_rank: Number(id.at(-1)), route_category: id === "route-0" ? "FASTEST" : "ALTERNATIVE",
  is_primary: id === "route-0", mode: "walking", duration_seconds: duration, distance_meters: distance,
  geometry, maneuvers: [], has_toll: false, has_highway: false, has_ferry: false,
  nearby_umkm_count: count, verified_umkm_count: count, distinct_category_count: count ? 1 : 0,
});
const base = (candidates: NavigationRouteCandidate[]): NavigationRouteResult => ({
  route_status: "ROUTABLE", reason_code: null, mode: "walking", engine: "valhalla", source: "OPENSTREETMAP",
  warnings: [], ...pick(candidates[0]), route_candidates: candidates,
});
function pick(value: NavigationRouteCandidate) {
  return { distance_meters: value.distance_meters, duration_seconds: value.duration_seconds, geometry: value.geometry,
    maneuvers: value.maneuvers, has_toll: false, has_highway: false, has_ferry: false };
}

describe("route UMKM corridor ranking", () => {
  it("selects the fastest provider route for FASTEST", () => {
    const result = selectCandidate(base([candidate("route-0", 500, 1000, 2), candidate("route-1", 550, 1100, 8)]),
      [candidate("route-0", 500, 1000, 2), candidate("route-1", 550, 1100, 8)], "FASTEST");
    expect(result.selected_route_id).toBe("route-0");
    expect(result.route_candidates?.[1].route_category).toBe("UMKM_AREA");
  });

  it("selects a richer genuine route only inside duration and distance bounds", () => {
    const candidates = [candidate("route-0", 500, 1000, 2), candidate("route-1", 620, 1200, 8), candidate("route-2", 900, 1800, 20)];
    const result = selectCandidate(base(candidates), candidates, "UMKM");
    expect(result.selected_route_id).toBe("route-1");
    expect(result.umkm_preference_available).toBe(true);
    expect(result.route_candidates?.find((item) => item.route_id === "route-2")?.route_category).toBe("ALTERNATIVE");
  });

  it("keeps fastest when there is no meaningful bounded UMKM alternative", () => {
    const candidates = [candidate("route-0", 500, 1000, 4), candidate("route-1", 600, 1100, 3)];
    const result = selectCandidate(base(candidates), candidates, "UMKM");
    expect(result.selected_route_id).toBe("route-0");
    expect(result.umkm_preference_available).toBe(false);
  });

  it("keeps valid routing and reports unavailable enrichment when PostGIS fails", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error("database unavailable") });
    const client = { rpc: vi.fn(() => ({ single })) };
    const result = await new RouteUmkmAnalysisService(client as never).enrich(base([candidate("route-0", 500, 1000, 0)]), "UMKM");
    expect(result.route_status).toBe("ROUTABLE");
    expect(result.umkm_enrichment_status).toBe("UNAVAILABLE");
    expect(result.geometry).toEqual(geometry);
  });
});
