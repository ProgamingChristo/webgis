import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RouteSelectionSheet } from "@/src/features/routing/components/route-selection-sheet";
import type { RoutingCandidate, RoutingResult } from "@/src/services/routing.service";

const geometry = { type: "LineString" as const, coordinates: [[106.8, -6.2], [106.81, -6.21]] as [[number, number], [number, number]] };
const candidate = (route_id: string, route_category: RoutingCandidate["route_category"], duration_seconds: number, count: number | null): RoutingCandidate => ({
  route_id, route_rank: Number(route_id.at(-1)), route_category, is_primary: route_id === "route-0", mode: "walking",
  distance_meters: route_id === "route-0" ? 1_000 : 1_200, duration_seconds, geometry, maneuvers: [],
  has_toll: false, has_highway: false, has_ferry: false, nearby_umkm_count: count,
  verified_umkm_count: count, distinct_category_count: count === null ? null : 1,
});
const route = (available: boolean): RoutingResult => ({
  route_status: "ROUTABLE", reason_code: null, mode: "walking", distance_meters: 1_000, duration_seconds: 600,
  geometry, maneuvers: [], warnings: [], limitation_flags: [], engine: "valhalla", source: "OPENSTREETMAP",
  route_source: "valhalla", analysis_method: "navigation_route", has_toll: false, has_highway: false, has_ferry: false,
  route_candidates: [candidate("route-0", "FASTEST", 600, 2), candidate("route-1", available ? "UMKM_AREA" : "ALTERNATIVE", 720, available ? 8 : 1)],
  selected_route_id: "route-0", route_preference: "FASTEST", umkm_preference_available: available,
  umkm_enrichment_status: "AVAILABLE",
});

describe("route selection sheet", () => {
  it("shows selected semantics, provider deltas, UMKM counts, and Start", () => {
    const html = renderToStaticMarkup(<RouteSelectionSheet route={route(true)} open onOpenChange={vi.fn()}
      originLabel="Lokasi Anda" destinationLabel="Pasar" onSelect={vi.fn()} onModeChange={vi.fn()}
      preference="FASTEST" onPreferenceChange={vi.fn()} onStart={vi.fn()} />);
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("Rute tercepat");
    expect(html).toContain("Lewat area UMKM");
    expect(html).toContain("+2 menit");
    expect(html).toContain("8 UMKM di sekitar jalur");
    expect(html).toContain("+200 m");
    expect(html).toContain("Mulai Perjalanan");
    expect(html).toContain("Estimasi tanpa data lalu lintas real-time.");
  });

  it("truthfully disables UMKM preference when no richer provider candidate exists", () => {
    const html = renderToStaticMarkup(<RouteSelectionSheet route={route(false)} open onOpenChange={vi.fn()}
      originLabel="Lokasi Anda" destinationLabel="Pasar" onSelect={vi.fn()} onModeChange={vi.fn()}
      preference="FASTEST" onPreferenceChange={vi.fn()} onStart={vi.fn()} />);
    expect(html).toContain("Belum ada alternatif lewat area UMKM untuk perjalanan ini.");
    expect(html).toMatch(/disabled=""[^>]*>.*Lewat area UMKM/s);
  });

  it("renders inline desktop planner with route cards, start CTA, and secondary collapsed directions", () => {
    const routeWithManeuvers = route(true);
    routeWithManeuvers.route_candidates![0].maneuvers = [
      { instruction: "Mulai berjalan ke utara di Jl. Merpati", distance_meters: 150, time_seconds: 90, type: 1 },
      { instruction: "Belok kanan ke Jl. Boulevard UPJ", distance_meters: 850, time_seconds: 510, type: 2 },
    ];
    const html = renderToStaticMarkup(<RouteSelectionSheet route={routeWithManeuvers} inline open onOpenChange={vi.fn()}
      originLabel="Stasiun Jurangmangu" destinationLabel="UPJ Bintaro" onSelect={vi.fn()} onModeChange={vi.fn()}
      preference="FASTEST" onPreferenceChange={vi.fn()} onStart={vi.fn()} />);

    // Inline desktop container
    expect(html).toContain("inlinePlanner");
    // Route cards
    expect(html).toContain("Rute tercepat");
    expect(html).toContain("Lewat area UMKM");
    expect(html).toContain("Mulai Perjalanan");
    // Collapsible directions (details element without open attribute)
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Lihat petunjuk (2)");
    expect(html).toContain("Mulai berjalan ke utara di Jl. Merpati");
    expect(html).toContain("Belok kanan ke Jl. Boulevard UPJ");
  });
});


