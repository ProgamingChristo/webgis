import { describe, expect, it, vi } from "vitest";
import { CommuterLocationAuthority } from "@/src/features/location/commuter-location-authority";

function createMockGeolocation() {
  let successCb: PositionCallback | null = null;
  let errorCb: PositionErrorCallback | null = null;
  let watchCount = 0;
  let clearCount = 0;

  const mock = {
    watchPosition: vi.fn((success: PositionCallback, error?: PositionErrorCallback | null) => {
      successCb = success;
      errorCb = error ?? null;
      watchCount++;
      return 101;
    }),
    clearWatch: vi.fn(() => {
      clearCount++;
      successCb = null;
      errorCb = null;
    }),
    emitPosition: (coords: Partial<GeolocationCoordinates>, timestamp?: number) => {
      if (successCb) {
        successCb({
          coords: {
            latitude: -6.2,
            longitude: 106.8,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            ...coords,
          },
          timestamp: timestamp ?? Date.now(),
        } as GeolocationPosition);
      }
    },
    emitError: (code: number, message = "GPS error") => {
      if (errorCb) {
        errorCb({
          code,
          message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      }
    },
    getWatchCount: () => watchCount,
    getClearCount: () => clearCount,
  };

  return mock;
}

describe("CommuterLocationAuthority", () => {
  it("starts in IDLE state with null fix", () => {
    const geo = createMockGeolocation();
    const authority = new CommuterLocationAuthority({ geolocation: () => geo });
    expect(authority.getSnapshot().state).toBe("IDLE");
    expect(authority.getSnapshot().fix).toBeNull();
    expect(authority.getSnapshot().isTracking).toBe(false);
  });

  it("transitions to REQUESTING and then ACTIVE upon first good GPS fix", () => {
    const geo = createMockGeolocation();
    const now = 1000;
    const authority = new CommuterLocationAuthority({
      geolocation: () => geo,
      now: () => now,
    });

    authority.startTracking();
    expect(authority.getSnapshot().state).toBe("REQUESTING");
    expect(authority.getSnapshot().isTracking).toBe(true);

    geo.emitPosition({ latitude: -6.1754, longitude: 106.8272, accuracy: 12 }, now);
    const snap = authority.getSnapshot();
    expect(snap.state).toBe("ACTIVE");
    expect(snap.fix).not.toBeNull();
    expect(snap.fix?.latitude).toBe(-6.1754);
    expect(snap.fix?.longitude).toBe(106.8272);
    expect(snap.fix?.accuracyMeters).toBe(12);
    expect(snap.error).toBeNull();
  });

  it("transitions to DEGRADED when accuracy is poor (> 50m)", () => {
    const geo = createMockGeolocation();
    const now = 1000;
    const authority = new CommuterLocationAuthority({
      geolocation: () => geo,
      now: () => now,
    });

    authority.startTracking();
    geo.emitPosition({ latitude: -6.1754, longitude: 106.8272, accuracy: 85 }, now);
    expect(authority.getSnapshot().state).toBe("DEGRADED");
    expect(authority.getSnapshot().fix?.accuracyMeters).toBe(85);
  });

  it("transitions to DENIED on permission denied error (code 1)", () => {
    const geo = createMockGeolocation();
    const authority = new CommuterLocationAuthority({ geolocation: () => geo });

    authority.startTracking();
    geo.emitError(1, "User denied geolocation");
    expect(authority.getSnapshot().state).toBe("DENIED");
    expect(authority.getSnapshot().error).toContain("Izin lokasi ditolak");
  });

  it("transitions to UNAVAILABLE on position unavailable error (code 2 or 3)", () => {
    const geo = createMockGeolocation();
    const authority = new CommuterLocationAuthority({ geolocation: () => geo });

    authority.startTracking();
    geo.emitError(2, "No satellite lock");
    expect(authority.getSnapshot().state).toBe("UNAVAILABLE");
  });

  it("detects STALE location when no updates arrive for > 30 seconds", () => {
    vi.useFakeTimers();
    try {
      const geo = createMockGeolocation();
      let currentTime = 100_000;
      const authority = new CommuterLocationAuthority({
        geolocation: () => geo,
        now: () => currentTime,
      });

      authority.startTracking();
      geo.emitPosition({ latitude: -6.1754, longitude: 106.8272, accuracy: 10 }, currentTime);
      expect(authority.getSnapshot().state).toBe("ACTIVE");

      // Advance time by 31 seconds
      currentTime += 31_000;
      vi.advanceTimersByTime(1500);

      expect(authority.getSnapshot().state).toBe("STALE");

      // Recover when fresh position arrives
      currentTime += 1000;
      geo.emitPosition({ latitude: -6.1755, longitude: 106.8273, accuracy: 15 }, currentTime);
      expect(authority.getSnapshot().state).toBe("ACTIVE");
    } finally {
      vi.useRealTimers();
    }
  });

  it("measures significant movement correctly against 50m threshold", () => {
    const geo = createMockGeolocation();
    const authority = new CommuterLocationAuthority({ geolocation: () => geo });

    authority.startTracking();
    geo.emitPosition({ latitude: -6.1754, longitude: 106.8272, accuracy: 10 });
    // First query coordinate not yet recorded -> hasMoved is true
    expect(authority.hasMovedSignificantly()).toBe(true);

    // Record query coordinate at current location
    authority.recordQueryCoordinate({ latitude: -6.1754, longitude: 106.8272 });
    expect(authority.hasMovedSignificantly()).toBe(false);

    // Small jitter (~5m move) -> false
    expect(
      authority.hasMovedSignificantly({ latitude: -6.17544, longitude: 106.8272 }),
    ).toBe(false);

    // Significant movement (~200m move) -> true
    expect(
      authority.hasMovedSignificantly({ latitude: -6.1772, longitude: 106.8272 }),
    ).toBe(true);
  });

  it("cleans up watcher on stopTracking", () => {
    const geo = createMockGeolocation();
    const authority = new CommuterLocationAuthority({ geolocation: () => geo });

    authority.startTracking();
    expect(geo.getWatchCount()).toBe(1);

    authority.stopTracking();
    expect(geo.getClearCount()).toBe(1);
    expect(authority.getSnapshot().state).toBe("IDLE");
    expect(authority.getSnapshot().isTracking).toBe(false);
  });
});
