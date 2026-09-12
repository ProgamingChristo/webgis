import {
  COMMUTER_LOCATION_POLICY,
  type CommuterFix,
  type CommuterLocationPolicy,
  type CommuterLocationSnapshot,
  type CommuterLocationState,
} from "./commuter-location.types";

type GeolocationProvider = Pick<Geolocation, "watchPosition" | "clearWatch">;

export interface CommuterLocationDependencies {
  geolocation?: () => GeolocationProvider | null;
  now?: () => number;
  policy?: CommuterLocationPolicy;
}

const initialSnapshot: CommuterLocationSnapshot = {
  state: "IDLE",
  fix: null,
  error: null,
  lastQueryCoordinate: null,
  isTracking: false,
  updatedAt: null,
};

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class CommuterLocationAuthority {
  private snapshot: CommuterLocationSnapshot = { ...initialSnapshot };
  private listeners = new Set<() => void>();
  private watchId: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private geo: GeolocationProvider | null = null;
  private readonly now: () => number;
  private readonly policy: CommuterLocationPolicy;
  private readonly getGeolocation: () => GeolocationProvider | null;

  constructor(deps: CommuterLocationDependencies = {}) {
    this.now = deps.now ?? Date.now;
    this.policy = deps.policy ?? COMMUTER_LOCATION_POLICY;
    this.getGeolocation =
      deps.geolocation ??
      (() =>
        typeof navigator !== "undefined" ? navigator.geolocation ?? null : null);
  }

  getSnapshot = (): CommuterLocationSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(update: Partial<CommuterLocationSnapshot>) {
    this.snapshot = {
      ...this.snapshot,
      ...update,
      updatedAt: this.now(),
    };
    this.listeners.forEach((listener) => listener());
  }

  startTracking = (): void => {
    if (this.snapshot.isTracking) return;

    this.geo = this.getGeolocation();
    if (!this.geo) {
      this.emit({
        state: "UNAVAILABLE",
        error: "Perangkat atau browser belum mendukung GPS/location.",
        isTracking: false,
      });
      return;
    }

    this.emit({
      state: "REQUESTING",
      error: null,
      isTracking: true,
    });

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000);

    try {
      this.watchId = this.geo.watchPosition(
        (pos) => this.handlePosition(pos),
        (err) => this.handleError(err),
        this.policy.geolocation,
      );
    } catch {
      this.emit({
        state: "UNAVAILABLE",
        error: "Gagal memulai pelacakan lokasi.",
        isTracking: false,
      });
    }
  };

  stopTracking = (): void => {
    this.cleanup();
    this.emit({
      state: "IDLE",
      isTracking: false,
    });
  };

  refresh = (): void => {
    this.cleanup();
    this.startTracking();
  };

  recordQueryCoordinate = (coord: { latitude: number; longitude: number }): void => {
    this.emit({ lastQueryCoordinate: { ...coord } });
  };

  hasMovedSignificantly = (coord?: { latitude: number; longitude: number } | null): boolean => {
    const current = coord ?? this.snapshot.fix;
    if (!current) return false;
    const previous = this.snapshot.lastQueryCoordinate;
    if (!previous) return true;
    const distance = haversineDistanceMeters(
      previous.latitude,
      previous.longitude,
      current.latitude,
      current.longitude,
    );
    return distance >= this.policy.movementThresholdMeters;
  };

  private handlePosition(position: GeolocationPosition): void {
    const coords = position.coords;
    const timestamp = position.timestamp || this.now();
    const accuracyMeters = Math.round(coords.accuracy);

    const fix: CommuterFix = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters,
      timestamp,
      capturedAt: new Date(timestamp).toISOString(),
    };

    const isDegraded = accuracyMeters > this.policy.maximumAccuracyMeters;
    const nextState: CommuterLocationState = isDegraded ? "DEGRADED" : "ACTIVE";

    this.emit({
      state: nextState,
      fix,
      error: null,
    });
  }

  private handleError(error: GeolocationPositionError): void {
    let state: CommuterLocationState = "UNAVAILABLE";
    let message = "Lokasi tidak dapat diperoleh.";

    if (error.code === 1) {
      // PERMISSION_DENIED
      state = "DENIED";
      message = "Izin lokasi ditolak oleh pengguna atau browser.";
    } else if (error.code === 2) {
      // POSITION_UNAVAILABLE
      state = "UNAVAILABLE";
      message = "Informasi lokasi tidak tersedia dari sensor atau jaringan.";
    } else if (error.code === 3) {
      // TIMEOUT
      state = "UNAVAILABLE";
      message = "Waktu permintaan lokasi habis.";
    }

    this.emit({
      state,
      error: message,
    });
  }

  private tick(): void {
    const fix = this.snapshot.fix;
    if (!fix || !this.snapshot.isTracking) return;

    const age = this.now() - fix.timestamp;
    if (age > this.policy.maximumFixAgeMs) {
      if (this.snapshot.state !== "STALE") {
        this.emit({ state: "STALE" });
      }
    }
  }

  private cleanup(): void {
    if (this.watchId !== null && this.geo) {
      try {
        this.geo.clearWatch(this.watchId);
      } catch {
        /* Ignore cleanup errors */
      }
      this.watchId = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// Export singleton instance for app-wide sharing
export const sharedCommuterLocationAuthority = new CommuterLocationAuthority();
