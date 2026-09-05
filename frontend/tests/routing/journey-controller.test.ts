import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { JourneyController } from "@/src/features/routing/journey-controller";
import { JOURNEY_POLICY as policy } from "@/src/features/routing/journey-policy";
import { RoutingClientError, type RoutingMode, type RoutingResult } from "@/src/services/routing.service";

const p1 = { latitude: -6.2151, longitude: 106.6842 };
const p2 = { latitude: -6.2161, longitude: 106.6852 };
const destination = { latitude: -6.218, longitude: 106.687 };
const journeyRequest = (origin: typeof p1, target = destination) => ({
  origin,
  destination: target,
  include_alternatives: true,
  route_preference: "FASTEST",
});
const payload = (mode: RoutingMode = "walking", distance = 600): RoutingResult => ({
  route_status: "ROUTABLE", mode, reason_code: null, distance_meters: distance, duration_seconds: 450,
  geometry: { type: "LineString", coordinates: [[106.6842, -6.2151], [106.685, -6.216], [106.687, -6.218]] },
  maneuvers: [], warnings: [], limitation_flags: [], engine: "test-fixture", source: "test-fixture",
  route_source: "test-fixture", analysis_method: "navigation_route", has_toll: false, has_highway: false, has_ferry: false,
});
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
let success: PositionCallback;
let failure: PositionErrorCallback;
let controller: JourneyController;
const clearWatch = vi.fn();
const watchPosition = vi.fn((ok: PositionCallback, fail?: PositionErrorCallback | null, options?: PositionOptions) => { void options; success = ok; failure = fail!; return 7; });
const route = vi.fn();
const authenticated = vi.fn();
const geo = vi.fn();
function fix(point = p1, accuracy = 5, timestamp = Date.now()) {
  success({ coords: { ...point, accuracy }, timestamp } as GeolocationPosition);
}
function error(code: number) { failure({ code } as GeolocationPositionError); }
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-05T08:00:00Z"));
  route.mockReset().mockImplementation(async (_request, mode) => payload(mode));
  authenticated.mockReset().mockResolvedValue(true);
  geo.mockReset().mockReturnValue({ watchPosition, clearWatch });
  controller = new JourneyController({ route, authenticated, geolocation: geo });
  controller.configure({ destination, mode: "walking" });
});
afterEach(() => { controller.dispose(); vi.useRealTimers(); });

describe("active journey lifecycle (controlled provider fixtures, not live acceptance)", () => {
  it("does not turn initial auth loading into a journey error", () => {
    controller.sessionLost(); expect(controller.getSnapshot().state).toBe("PREVIEW");
  });
  it("requires a destination and an authenticated session before starting GPS", async () => {
    controller.configure({ destination: null, mode: "walking" }); await controller.start();
    expect(authenticated).not.toHaveBeenCalled();
    controller.configure({ destination, mode: "walking" }); authenticated.mockResolvedValue(false);
    await controller.start(); expect(watchPosition).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", engaged: false, authRequired: true, position: null });
  });
  it("uses one high-accuracy watch and a fresh GPS origin, never preview A", async () => {
    await controller.start(); await controller.start();
    expect(watchPosition).toHaveBeenCalledTimes(1);
    expect(watchPosition.mock.calls[0][2]).toEqual(policy.geolocation);
    expect(controller.getSnapshot().state).toBe("REQUESTING_LOCATION");
    expect(route).not.toHaveBeenCalled(); fix(); await flush();
    expect(route.mock.calls[0][0]).toEqual(journeyRequest(p1));
    expect(controller.getSnapshot()).toMatchObject({ state: "ACTIVE", engaged: true, route: { distance_meters: 600 } });
  });
  it.each([1, 2, 3])("handles geolocation error %s without invented position or route", async (code) => {
    await controller.start(); error(code); await flush();
    expect(route).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", position: null, route: null });
    if (code === 1) { expect(clearWatch).toHaveBeenCalledWith(7); expect(controller.getSnapshot().engaged).toBe(false); }
  });
  it("handles unsupported geolocation", async () => {
    geo.mockReturnValue(null); await controller.start();
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", engaged: false });
  });
  it.each([NaN, 100, -1])("rejects accuracy %s", async (accuracy) => {
    await controller.start(); fix(p1, accuracy); await flush(); expect(route).not.toHaveBeenCalled();
    expect(controller.getSnapshot().route).toBeNull();
  });
  it("rejects invalid coordinates and stale/future fixes", async () => {
    await controller.start(); fix({ latitude: 91, longitude: 106 });
    fix(p1, 5, Date.now() - policy.maximumFixAgeMs - 1); fix(p1, 5, Date.now() + 2000);
    await flush(); expect(route).not.toHaveBeenCalled();
  });
  it("ignores out-of-order GPS events", async () => {
    await controller.start(); fix(); await flush();
    await vi.advanceTimersByTimeAsync(1000); fix(p2); fix(p1, 5, Date.now() - 500);
    expect(controller.getSnapshot().position).toMatchObject(p2);
  });
  it("coalesces movement with both time and displacement gates", async () => {
    await controller.start(); fix(); await flush();
    for (let i = 0; i < 50; i++) fix(p1);
    await vi.advanceTimersByTimeAsync(1000); fix(p2);
    expect(controller.getSnapshot().route).toBeNull();
    expect(route).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(14_000);
    expect(route).toHaveBeenCalledTimes(2);
    expect(route.mock.calls[1][0]).toEqual(journeyRequest(p2));
    expect(controller.getSnapshot().state).toBe("ACTIVE");
  });
  it("does not reroute for stationary GPS updates even after interval", async () => {
    await controller.start(); fix(); await flush();
    await vi.advanceTimersByTimeAsync(15_000); fix(); await flush();
    expect(route).toHaveBeenCalledTimes(1);
  });
  it("supersedes late P1 response with P2 and aborts old transport", async () => {
    const old = deferred<RoutingResult>(); route.mockImplementationOnce(() => old.promise);
    await controller.start(); fix(); const signal = route.mock.calls[0][2];
    await vi.advanceTimersByTimeAsync(1000); fix(p2);
    expect(signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(14_000);
    old.resolve(payload("walking", 999)); await flush();
    expect(controller.getSnapshot().route?.distance_meters).toBe(600);
    expect(controller.getSnapshot().position).toMatchObject(p2);
  });
  it.each(["walking", "motorcycle", "car"] as const)("preserves %s and routes immediate mode changes from latest GPS", async (mode) => {
    await controller.start(); fix(); await flush(); fix(p2);
    controller.configure({ destination, mode: mode === "walking" ? "car" : "walking" });
    controller.configure({ destination, mode }); await flush();
    expect(route.mock.calls.at(-1)?.[0]).toEqual(journeyRequest(p2));
    expect(controller.getSnapshot().route?.mode).toBe(mode);
    expect(watchPosition).toHaveBeenCalledTimes(1);
  });
  it("reroutes destination change immediately without changing GPS origin", async () => {
    await controller.start(); fix(); await flush();
    const b = { latitude: -6.219, longitude: 106.689 };
    controller.configure({ destination: b, mode: "walking" });
    expect(controller.getSnapshot().route).toBeNull(); await flush();
    expect(route.mock.calls.at(-1)?.[0]).toEqual(journeyRequest(p1, b));
  });
  it("rate bounds repeated manual refresh", async () => {
    await controller.start(); fix(); await flush();
    for (let i = 0; i < 20; i++) controller.refresh();
    expect(route).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000); controller.refresh(); await flush();
    expect(route).toHaveBeenCalledTimes(2);
  });
  it("stop aborts requests, clears watch/timers, and ignores late callbacks", async () => {
    const old = deferred<RoutingResult>(); route.mockReturnValueOnce(old.promise);
    await controller.start(); fix(); const signal = route.mock.calls[0][2]; controller.stop();
    expect(signal.aborted).toBe(true); expect(clearWatch).toHaveBeenCalledWith(7);
    fix(p2); old.resolve(payload()); await vi.advanceTimersByTimeAsync(60_000);
    expect(route).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({ state: "STOPPED", engaged: false, following: false, position: null, route: null });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up on dispose/unmount", async () => {
    await controller.start(); controller.dispose(); fix(); await flush();
    expect(clearWatch).toHaveBeenCalledWith(7); expect(route).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("cleans up auth in progress when stopped", async () => {
    const auth = deferred<boolean>(); authenticated.mockReturnValue(auth.promise);
    const starting = controller.start(); controller.stop(); auth.resolve(true); await starting;
    expect(watchPosition).not.toHaveBeenCalled();
  });
  it("cleans up on session loss and does not persist location", async () => {
    await controller.start(); fix(); await flush(); controller.sessionLost(); fix(p2);
    expect(clearWatch).toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ engaged: false, position: null, route: null, authRequired: true });
  });
  it("treats provider 401 as session loss", async () => {
    route.mockRejectedValue(new RoutingClientError("AUTH")); await controller.start(); fix(); await flush();
    expect(controller.getSnapshot().authRequired).toBe(true); expect(clearWatch).toHaveBeenCalled();
  });
  it.each(["TIMEOUT", "UNAVAILABLE", "INVALID_RESPONSE"] as const)("fails safely on %s", async (kind) => {
    route.mockRejectedValue(new RoutingClientError(kind)); await controller.start(); fix(); await flush();
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", route: null });
  });
  it.each(["UNROUTABLE", "OUTSIDE_GRAPH", "SERVICE_UNAVAILABLE"] as const)("preserves %s failure without stale success", async (status) => {
    await controller.start(); fix(); await flush();
    route.mockResolvedValue({ ...payload(), route_status: status, geometry: null, distance_meters: null, duration_seconds: null });
    await vi.advanceTimersByTimeAsync(1000); controller.refresh(); await flush();
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", route: null });
  });
  it("rejects malformed route geometry independently", async () => {
    route.mockResolvedValue({ ...payload(), geometry: null }); await controller.start(); fix(); await flush();
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", route: null });
  });
  it("drops metrics on GPS loss and recovers only with another fix and backend response", async () => {
    await controller.start(); fix(); await flush(); error(2);
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", route: null, position: p1 });
    fix(p2); await vi.advanceTimersByTimeAsync(policy.minimumIntervalMs);
    expect(route).toHaveBeenCalledTimes(2); expect(controller.getSnapshot().state).toBe("ACTIVE");
  });
  it("bounds repeated GPS loss/recovery without queuing each event", async () => {
    await controller.start(); fix(); await flush();
    for (let i = 0; i < 20; i++) { error(2); fix(); }
    expect(route).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(policy.minimumIntervalMs); expect(route).toHaveBeenCalledTimes(2);
  });
  it("invalidates metrics after silent GPS loss", async () => {
    await controller.start(); fix(); await flush(); await vi.advanceTimersByTimeAsync(21_000);
    expect(controller.getSnapshot()).toMatchObject({ state: "ERROR", route: null });
  });
  it("suspends follow for manual camera control and allows explicit recenter", async () => {
    await controller.start(); fix(); await flush(); controller.suspendFollow(); fix(p2);
    expect(controller.getSnapshot().following).toBe(false); controller.focus(); expect(controller.getSnapshot().following).toBe(true);
  });
  it("arrives only with fresh accurate GPS plus short real-provider-contract route", async () => {
    route.mockResolvedValue(payload("walking", 20)); await controller.start();
    fix({ latitude: destination.latitude + 0.00005, longitude: destination.longitude }); await flush();
    expect(controller.getSnapshot()).toMatchObject({ state: "ARRIVED", engaged: false, route: { distance_meters: 20 } });
    expect(clearWatch).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("does not claim arrival from proximity alone or inaccurate GPS", async () => {
    await controller.start(); fix(destination); await flush(); expect(controller.getSnapshot().state).toBe("ACTIVE");
    route.mockResolvedValue(payload("walking", 20)); await vi.advanceTimersByTimeAsync(1000);
    fix(destination, 40); controller.refresh(); await flush(); expect(controller.getSnapshot().state).toBe("ACTIVE");
  });
});
