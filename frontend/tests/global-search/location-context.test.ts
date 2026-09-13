import { describe, expect, it } from "vitest";

import {
  boundsAroundLocation,
  canRequestAutoLocation,
  DEFAULT_NEARBY_RADIUS_METERS,
  requestAutoLocationOnce,
} from "@/src/features/global-search/location-context";

describe("automatic nearby location context", () => {
  it("requests location for prompt or granted permission and respects a denial", () => {
    expect(canRequestAutoLocation("prompt")).toBe(true);
    expect(canRequestAutoLocation("granted")).toBe(true);
    expect(canRequestAutoLocation(null)).toBe(true);
    expect(canRequestAutoLocation("denied")).toBe(false);
  });

  it("requests geolocation once when a StrictMode effect runs twice", async () => {
    const started = { current: false };
    let requestCount = 0;
    const options = {
      started,
      geolocationSupported: true,
      getPermissionState: async () => "prompt" as const,
      onDenied: () => undefined,
      onUnsupported: () => undefined,
      onRequest: () => { requestCount += 1; },
    };

    await requestAutoLocationOnce(options);
    await requestAutoLocationOnce(options);

    expect(requestCount).toBe(1);
  });

  it("does not request a coordinate after permission was denied", async () => {
    let requestCount = 0;
    let deniedCount = 0;
    await requestAutoLocationOnce({
      started: { current: false },
      geolocationSupported: true,
      getPermissionState: async () => "denied",
      onDenied: () => { deniedCount += 1; },
      onUnsupported: () => undefined,
      onRequest: () => { requestCount += 1; },
    });

    expect(requestCount).toBe(0);
    expect(deniedCount).toBe(1);
  });

  it("builds a bounded search box around the real user coordinate", () => {
    const bounds = boundsAroundLocation(
      { latitude: -6.2, longitude: 106.816_666 },
      DEFAULT_NEARBY_RADIUS_METERS,
    );

    expect(bounds.west).toBeLessThan(106.816_666);
    expect(bounds.east).toBeGreaterThan(106.816_666);
    expect(bounds.south).toBeLessThan(-6.2);
    expect(bounds.north).toBeGreaterThan(-6.2);
    expect(bounds.north - bounds.south).toBeLessThan(0.04);
  });

  it("caps an excessive radius before creating the viewport", () => {
    const bounds = boundsAroundLocation(
      { latitude: -6.2, longitude: 106.816_666 },
      100_000,
    );

    expect(bounds.north - bounds.south).toBeLessThan(0.19);
  });
});
