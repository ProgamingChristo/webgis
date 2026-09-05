import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routingService, parseRoutingResult, type RoutingMode } from "@/src/services/routing.service";
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
});
