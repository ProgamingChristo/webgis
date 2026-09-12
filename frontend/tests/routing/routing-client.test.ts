import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeProgressService, routingService, parseRoutingResult, selectRoutingCandidate, type RoutingMode } from "@/src/services/routing.service";
import { isRouteGeometry } from "@/src/features/routing/route-geometry";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/src/lib/supabase/browser", () => ({ getBrowserSupabaseClient: () => ({ auth: { getSession: session } }) }));
const fetchMock = vi.fn();
const origin = { latitude: -6.2, longitude: 106.8 };
const destination = { latitude: -6.21, longitude: 106.81 };
const geometry = { type: "LineString", coordinates: [[106.8, -6.2], [106.805, -6.207], [106.81, -6.21]] };
function result(mode: RoutingMode = "walking") {
  return { route_status: "ROUTABLE", mode, reason_code: null, distance_meters: 1250, duration_seconds: 820,
    geometry, maneuvers: [], warnings: [], limitation_flags: [], engine: "valhalla", source: "OPENSTREETMAP",
    route_source: "valhalla", analysis_method: "navigation_route", has_toll: false, has_highway: false, has_ferry: false };
}
function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GETRA_API_URL", "https://api.example.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  session.mockResolvedValue({ data: { session: { access_token: "unit-test-session" } }, error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("authenticated routing client", () => {
  it("requests backend route progress without accepting client-computed remaining metrics", async () => {
    const progress = {
      analysis_method: "route_linear_reference",
      distance_from_route_meters: 3,
      matched_position: origin,
      next_maneuver: null,
      on_route: true,
      progress_fraction: 0.2,
      remaining_distance_meters: 1_000,
      remaining_duration_seconds: 650,
      remaining_geometry: geometry,
      tolerance_meters: 18,
    };
    fetchMock.mockResolvedValue(respond({ success: true, data: progress }));
    await expect(routeProgressService.getProgress({
      accuracy_meters: 8,
      current_position: origin,
      mode: "walking",
      route: {
        distance_meters: 1_250,
        duration_seconds: 820,
        geometry: { type: "LineString", coordinates: geometry.coordinates as [number, number][] },
        maneuvers: [],
      },
    })).resolves.toMatchObject({ progress_fraction: 0.2, remaining_distance_meters: 1_000 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/routing/progress");
    expect(JSON.parse(options.body)).not.toHaveProperty("remaining_distance_meters");
  });
  it.each(["walking", "motorcycle", "car"] as const)("sends current coordinates, %s and the existing user session", async (mode) => {
    fetchMock.mockResolvedValue(respond({ success: true, data: result(mode) }));
    expect((await routingService.getRoute({ origin, destination }, mode)).mode).toBe(mode);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/routing");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer unit-test-session");
    expect(JSON.parse(options.body)).toEqual({ origin, destination, mode });
  });
  it("uses changed A and B independently without product constants", async () => {
    fetchMock.mockImplementation(() => respond({ success: true, data: result() }));
    const a2 = { latitude: -6.22222, longitude: 106.83333 };
    const b2 = { latitude: -6.24444, longitude: 106.85555 };
    await routingService.getRoute({ origin, destination }, "walking");
    await routingService.getRoute({ origin: a2, destination }, "walking");
    await routingService.getRoute({ origin: a2, destination: b2 }, "walking");
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { origin, destination, mode: "walking" }, { origin: a2, destination, mode: "walking" },
      { origin: a2, destination: b2, mode: "walking" },
    ]);
  });
  it("sends an explicit alternative and UMKM preference without changing legacy calls", async () => {
    fetchMock.mockResolvedValue(respond({ success: true, data: result() }));
    await routingService.getRoute({ origin, destination, include_alternatives: true, route_preference: "UMKM" }, "walking");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      origin, destination, mode: "walking", include_alternatives: true, route_preference: "UMKM",
    });
  });
  it("does not request an anonymous route", async () => {
    session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(routingService.getRoute({ origin, destination }, "car")).rejects.toMatchObject({ kind: "AUTH" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([[401, "AUTH"], [400, "VALIDATION"], [503, "UNAVAILABLE"]])("normalizes HTTP %s without leaking raw messages", async (status, kind) => {
    fetchMock.mockResolvedValue(respond({ success: false, error: { message: "internal-only-debug" } }, Number(status)));
    await expect(routingService.getRoute({ origin, destination }, "walking")).rejects.toMatchObject({ kind, message: kind });
  });
  it("maps network failure to service unavailable, never no-route", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(routingService.getRoute({ origin, destination }, "walking")).rejects.toMatchObject({ kind: "UNAVAILABLE" });
  });
  it.each([[401, "AUTH"], [400, "VALIDATION"], [200, "INVALID_RESPONSE"], [503, "UNAVAILABLE"]])("preserves HTTP %s classification for a malformed envelope", async (status, kind) => {
    fetchMock.mockResolvedValue(respond(null, Number(status)));
    await expect(routingService.getRoute({ origin, destination }, "walking")).rejects.toMatchObject({ kind });
  });
  it.each(["UNROUTABLE", "OUTSIDE_GRAPH", "SERVICE_UNAVAILABLE"])("preserves %s with absent geometry and metrics", async (status) => {
    const data = { ...result(), route_status: status, reason_code: "ROUTING_TIMEOUT", geometry: null, distance_meters: null, duration_seconds: null };
    fetchMock.mockResolvedValue(respond({ success: true, data }));
    expect(await routingService.getRoute({ origin, destination }, "walking")).toMatchObject({ route_status: status, geometry: null, distance_meters: null });
  });
  it("rejects invalid coordinates before authentication/provider fetch", async () => {
    await expect(routingService.getRoute({ origin: { latitude: 91, longitude: 106 }, destination }, "walking")).rejects.toMatchObject({ kind: "VALIDATION" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("bounds a stalled browser request and aborts transport", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const pending = expect(routingService.getRoute({ origin, destination }, "walking")).rejects.toMatchObject({ kind: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(20_001);
    await pending;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("forwards caller cancellation without fabricating a result", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const pending = expect(routingService.getRoute({ origin, destination }, "walking", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    controller.abort();
    await pending;
  });
});

describe("strict routing response geometry", () => {
  it.each([null, { type: "Point", coordinates: [106, -6] }, { type: "LineString", coordinates: [] },
    { type: "LineString", coordinates: [[106, -6]] },
    { type: "LineString", coordinates: [[-6, 106], [-6.1, 106.1]] },
    { type: "LineString", coordinates: [[106, -6], [Infinity, -6]] }])("rejects invalid geometry %#", (invalid) => {
    expect(isRouteGeometry(invalid)).toBe(false);
    expect(() => parseRoutingResult({ ...result(), geometry: invalid }, "walking")).toThrow();
  });
  it("preserves provider GeoJSON coordinate order and numbers", () => {
    expect(parseRoutingResult(result(), "walking").geometry).toEqual(geometry);
  });
  it("rejects mismatched modes and zero, negative or missing summaries", () => {
    expect(() => parseRoutingResult(result("car"), "walking")).toThrow();
    for (const value of [0, -1, null, undefined]) {
      expect(() => parseRoutingResult({ ...result(), distance_meters: value }, "walking")).toThrow();
      expect(() => parseRoutingResult({ ...result(), duration_seconds: value }, "walking")).toThrow();
    }
    expect(() => parseRoutingResult({}, "walking")).toThrow();
  });
  it("rejects failure payloads that contain fabricated success fields", () => {
    expect(() => parseRoutingResult({ ...result(), route_status: "SERVICE_UNAVAILABLE" }, "walking")).toThrow();
  });
  it("parses genuine alternative routes array with via names and fastest flag", () => {
    const multiRoute = {
      ...result("car"),
      routes: [
        {
          id: "route-0",
          name: "Lewat Jalan Sudirman",
          is_fastest: true,
          distance_meters: 1250,
          duration_seconds: 420,
          geometry,
          maneuvers: [],
          has_toll: false,
          has_highway: false,
          has_ferry: false,
          warnings: [],
        },
        {
          id: "route-1",
          name: "Lewat Jalan Gatot Subroto",
          is_fastest: false,
          distance_meters: 1500,
          duration_seconds: 480,
          geometry,
          maneuvers: [],
          has_toll: false,
          has_highway: false,
          has_ferry: false,
          warnings: [],
        },
      ],
    };
    const parsed = parseRoutingResult(multiRoute, "car");
    expect(parsed.routes).toHaveLength(2);
    expect(parsed.routes?.[0].name).toBe("Lewat Jalan Sudirman");
    expect(parsed.routes?.[0].is_fastest).toBe(true);
    expect(parsed.routes?.[1].name).toBe("Lewat Jalan Gatot Subroto");
    expect(parsed.routes?.[1].is_fastest).toBe(false);
  });

  it("switches route-specific warnings and preserves enrichment warnings when choosing another candidate", () => {
    const routes = [0, 1].map((index) => ({
      ...result("car"), id: `route-${index}`, name: `Route ${index}`, is_fastest: index === 0,
      duration_seconds: 420 + index * 60,
      warnings: [index === 0 ? "Primary route warning" : "Alternative route warning"],
    }));
    const parsed = parseRoutingResult({
      ...result("car"), routes, selected_route_id: "route-0", umkm_enrichment_status: "UNAVAILABLE",
      warnings: ["Primary route warning", "Data UMKM rute belum tersedia."],
      route_candidates: routes.map((route, index) => ({
        ...route, route_id: route.id, route_rank: index, route_category: index === 0 ? "FASTEST" : "ALTERNATIVE",
        is_primary: index === 0, nearby_umkm_count: null, verified_umkm_count: null, distinct_category_count: null,
      })),
    }, "car");
    const selected = selectRoutingCandidate(parsed, parsed.route_candidates![1]);
    expect(selected).toMatchObject({ selected_route_id: "route-1", duration_seconds: 480 });
    expect(selected.warnings).toEqual(["Alternative route warning", "Data UMKM rute belum tersedia."]);
    expect(selected.routes).toEqual(parsed.routes);
    expect(selectRoutingCandidate(selected, selected.route_candidates![0]).warnings)
      .toEqual(["Primary route warning", "Data UMKM rute belum tersedia."]);
  });
});
