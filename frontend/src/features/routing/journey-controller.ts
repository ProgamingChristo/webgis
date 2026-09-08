import { RoutingClientError, parseRoutingResult, type RoutePreference, type RoutingMode, type RoutingResult, type RoutingRequest } from "@/src/services/routing.service";
import type { Coordinate } from "@/src/types/spatial";
import { JOURNEY_POLICY as policy, proximityMeters, validCoordinate } from "./journey-policy";

export type JourneyState = "PREVIEW" | "REQUESTING_LOCATION" | "STARTING" | "ACTIVE" | "REROUTING" | "ARRIVED" | "STOPPED" | "ERROR";
export type JourneyGpsState = "GPS_REQUESTING" | "GPS_GOOD" | "GPS_DEGRADED" | "GPS_STALE" | "GPS_UNAVAILABLE" | "GPS_PERMISSION_DENIED";
export type JourneyFix = Coordinate & { accuracyMeters: number; capturedAt: string; timestamp: number };
export type JourneySnapshot = {
  state: JourneyState; engaged: boolean; position: JourneyFix | null; route: RoutingResult | null;
  error: string | null; authRequired: boolean; following: boolean; updatedAt: number | null; routeKey: string; focusKey: number;
  gpsState: JourneyGpsState; gpsAccuracyMeters: number | null; routeStale: boolean;
};
type Config = { destination: Coordinate | null; mode: RoutingMode; preference?: RoutePreference };
type Dependencies = {
  geolocation: () => Pick<Geolocation, "watchPosition" | "clearWatch"> | null;
  authenticated: () => Promise<boolean>;
  route: (request: RoutingRequest, mode: RoutingMode, signal: AbortSignal) => Promise<RoutingResult>;
  now?: () => number;
};
const initial: JourneySnapshot = { state: "PREVIEW", engaged: false, position: null, route: null,
  error: null, authRequired: false, following: false, updatedAt: null, routeKey: "", focusKey: 0,
  gpsState: "GPS_UNAVAILABLE", gpsAccuracyMeters: null, routeStale: false };

// One controller owns the watch, pending request, and latest accepted route per mounted planner.
export class JourneyController {
  private snapshot: JourneySnapshot = initial;
  private listeners = new Set<() => void>();
  private config: Config = { destination: null, mode: "walking" };
  private generation = 0;
  private session = 0;
  private watch: number | null = null;
  private geo: ReturnType<Dependencies["geolocation"]> = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private controller: AbortController | null = null;
  private lastOrigin: JourneyFix | null = null;
  private lastRequestAt = -Infinity;
  private pending = false;
  private locationValid = false;
  private needsRoute = false;
  private recentFixes: JourneyFix[] = [];
  private latestObservedFix: JourneyFix | null = null;
  private lastObservedTimestamp = -Infinity;
  private poorAccuracySamples = 0;
  private readonly now: () => number;
  constructor(private readonly deps: Dependencies) { this.now = deps.now ?? Date.now; }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(update: Partial<JourneySnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.listeners.forEach((listener) => listener());
  }
  configure(config: Config) {
    const changed = JSON.stringify(config) !== JSON.stringify(this.config);
    this.config = config;
    if (!changed) return;
    if (this.snapshot.state === "ARRIVED") { this.stop(); return; }
    if (!this.snapshot.engaged) return;
    if (!validCoordinate(config.destination)) { this.stop(); return; }
    this.cancelRequest();
    this.emit({ route: null, updatedAt: null, routeStale: false });
    this.request(true);
  }
  start = async () => {
    if (this.snapshot.engaged || !validCoordinate(this.config.destination)) return;
    this.cleanup();
    const session = this.session;
    this.lastOrigin = null;
    this.lastRequestAt = -Infinity;
    this.locationValid = false;
    this.needsRoute = false;
    this.recentFixes = [];
    this.latestObservedFix = null;
    this.lastObservedTimestamp = -Infinity;
    this.poorAccuracySamples = 0;
    this.emit({ ...initial, engaged: true, state: "REQUESTING_LOCATION", following: true, gpsState: "GPS_REQUESTING" });
    let authenticated = false;
    try { authenticated = await this.deps.authenticated(); } catch { /* Auth errors stay local and sanitized. */ }
    if (session !== this.session) return;
    if (!authenticated) { this.sessionLost(); return; }
    this.geo = this.deps.geolocation();
    if (!this.geo) { this.locationError(2, true); return; }
    this.timer = setInterval(() => this.tick(), 1_000);
    try {
      const watch = this.geo.watchPosition((p) => {
        if (session === this.session) this.position(p);
      }, (e) => { if (session === this.session) this.locationError(e.code); }, policy.geolocation);
      // A synchronous test/platform callback may have stopped the journey already.
      if (session !== this.session) this.geo?.clearWatch(watch);
      else this.watch = watch;
    } catch { this.locationError(2, true); }
  };
  private hasFreshAcceptedFix() {
    const fix = this.snapshot.position;
    return Boolean(fix && this.now() - fix.timestamp <= policy.maximumFixAgeMs &&
      fix.accuracyMeters <= policy.maximumAccuracyMeters);
  }
  private selectRecentFix(latest: JourneyFix) {
    const cutoff = this.now() - policy.maximumFixAgeMs;
    this.recentFixes = [...this.recentFixes.filter((fix) => fix.timestamp >= cutoff), latest]
      .slice(-policy.recentFixBufferSize);
    const best = this.recentFixes.reduce((candidate, fix) =>
      fix.accuracyMeters < candidate.accuracyMeters ? fix : candidate, latest);
    const brieflyBetter = latest.timestamp - best.timestamp <= policy.bestFixHoldMs &&
      latest.accuracyMeters > best.accuracyMeters + policy.accuracyRegressionToleranceMeters;
    return brieflyBetter ? best : latest;
  }
  private degradeGps(gpsState: JourneyGpsState, error: string, accuracyMeters: number | null = null) {
    const freshAcceptedFix = this.hasFreshAcceptedFix();
    this.locationValid = freshAcceptedFix;
    if (!freshAcceptedFix) this.cancelRequest();
    this.emit({
      state: this.snapshot.route
        ? this.snapshot.state === "REROUTING" && freshAcceptedFix ? "REROUTING" : "ACTIVE"
        : "REQUESTING_LOCATION",
      engaged: true,
      gpsState,
      gpsAccuracyMeters: accuracyMeters,
      routeStale: !freshAcceptedFix && Boolean(this.snapshot.route),
      error,
    });
  }
  private position(p: GeolocationPosition) {
    if (!this.snapshot.engaged) return;
    const fix: JourneyFix = { latitude: p.coords.latitude, longitude: p.coords.longitude,
      accuracyMeters: p.coords.accuracy, timestamp: p.timestamp, capturedAt: "" };
    if (!validCoordinate(fix) || !Number.isFinite(fix.timestamp) || fix.timestamp > this.now() + 1000 ||
      !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters < 0) {
      this.degradeGps("GPS_UNAVAILABLE", "Data lokasi dari perangkat tidak valid."); return;
    }
    if (this.now() - fix.timestamp > policy.maximumFixAgeMs) {
      this.degradeGps("GPS_STALE", "Data GPS sudah kedaluwarsa. Menunggu lokasi terbaru.", fix.accuracyMeters); return;
    }
    if (fix.timestamp < this.lastObservedTimestamp) return;
    this.lastObservedTimestamp = fix.timestamp;
    this.latestObservedFix = fix;
    if (fix.accuracyMeters > policy.maximumAccuracyMeters) {
      this.poorAccuracySamples += 1;
      if (this.hasFreshAcceptedFix() && this.poorAccuracySamples < policy.degradedSampleThreshold) return;
      this.degradeGps("GPS_DEGRADED", `GPS ditemukan, tetapi akurasinya belum cukup (\u00b1${Math.round(fix.accuracyMeters)} m).`, fix.accuracyMeters);
      return;
    }
    fix.capturedAt = new Date(fix.timestamp).toISOString();
    this.poorAccuracySamples = 0;
    const acceptedFix = this.selectRecentFix(fix);
    const recovered = !this.locationValid || this.snapshot.gpsState !== "GPS_GOOD";
    this.locationValid = true;
    this.emit({ position: acceptedFix, gpsState: "GPS_GOOD", gpsAccuracyMeters: acceptedFix.accuracyMeters,
      routeStale: false, error: null });
    if (recovered) this.request(this.lastOrigin === null);
    else this.tick();
  }
  private locationError(code: number, terminal = false) {
    if (code === 1) {
      this.cleanup();
      this.emit({ ...initial, state: "ERROR", gpsState: "GPS_PERMISSION_DENIED",
        error: "Izin lokasi diperlukan untuk memulai navigasi." });
      return;
    }
    if (terminal) {
      this.cleanup();
      this.emit({ ...initial, state: "ERROR", gpsState: "GPS_UNAVAILABLE",
        error: "Perangkat atau browser belum mendukung lokasi." });
      return;
    }
    const stale = code === 3 && this.snapshot.position !== null;
    this.degradeGps(stale ? "GPS_STALE" : "GPS_UNAVAILABLE", stale
      ? "Data GPS sudah kedaluwarsa. Menunggu lokasi terbaru."
      : code === 3
        ? "Pengambilan lokasi terlalu lama. Menunggu GPS yang lebih akurat."
        : "Lokasi perangkat sementara tidak tersedia. Periksa GPS dan izin lokasi.");
  }
  private tick() {
    const p = this.snapshot.position;
    if (!this.snapshot.engaged || !p) return;
    if (this.now() - p.timestamp > policy.maximumFixAgeMs) {
      if (this.snapshot.gpsState !== "GPS_STALE") this.locationError(3);
      return;
    }
    if (!this.locationValid) return;
    const movementThreshold = policy.movementMeters[this.config.mode];
    const uncertainty = this.lastOrigin ? Math.min(Math.max(p.accuracyMeters, this.lastOrigin.accuracyMeters), movementThreshold) : 0;
    const moved = this.lastOrigin && proximityMeters(p, this.lastOrigin) >= movementThreshold + uncertainty;
    if (moved || this.needsRoute) {
      if (moved && this.pending) this.cancelRequest();
      this.request(false);
    }
  }
  refresh = () => {
    if (this.snapshot.gpsState !== "GPS_GOOD") return;
    if (this.now() - this.lastRequestAt < policy.manualIntervalMs) return;
    this.request(true);
  };
  private request(immediate: boolean) {
    const origin = this.snapshot.position;
    const destination = this.config.destination;
    if (!this.snapshot.engaged || !origin || !validCoordinate(destination) || !this.locationValid) return;
    if (this.now() - origin.timestamp > policy.maximumFixAgeMs) { this.locationError(3); return; }
    if (!immediate && (this.pending || this.now() - this.lastRequestAt < policy.minimumIntervalMs)) { this.needsRoute = true; return; }
    this.needsRoute = false;
    this.cancelRequest();
    const generation = this.generation;
    const mode = this.config.mode;
    const controller = new AbortController();
    this.controller = controller;
    this.pending = true;
    this.lastRequestAt = this.now();
    const rerouting = this.lastOrigin !== null;
    this.emit({ ...(rerouting ? {} : { route: null, updatedAt: null }), error: null,
      routeStale: false, state: rerouting ? "REROUTING" : "STARTING" });
    this.lastOrigin = origin;
    void this.deps.route({ origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: destination.latitude, longitude: destination.longitude },
      include_alternatives: true, route_preference: this.config.preference ?? "FASTEST" }, mode, controller.signal)
      .then((value) => {
        if (generation !== this.generation || controller.signal.aborted) return;
        const route = parseRoutingResult(value, mode);
        this.pending = false;
        if (route.route_status !== "ROUTABLE") {
          this.emit({ state: "ERROR", route: null, error: route.reason_code === "ROUTING_TIMEOUT"
            ? "Layanan rute tidak merespons tepat waktu. Coba lagi."
            : route.route_status === "SERVICE_UNAVAILABLE" ? "Layanan rute sementara tidak tersedia."
            : "Rute tidak ditemukan untuk lokasi dan moda ini." }); return;
        }
        const current = this.snapshot.position!;
        const latestObserved = this.latestObservedFix;
        const fresh = this.locationValid && this.now() - current.timestamp <= policy.maximumFixAgeMs;
        if (!fresh) { this.locationError(3); return; }
        const arrived = Boolean(latestObserved && latestObserved.accuracyMeters <= policy.arrivalAccuracyMeters &&
          this.now() - latestObserved.timestamp <= policy.maximumFixAgeMs &&
          this.now() - origin.timestamp <= policy.maximumFixAgeMs &&
          proximityMeters(latestObserved, origin) <= policy.arrivalOriginDriftMeters &&
          proximityMeters(latestObserved, destination) <= policy.arrivalProximityMeters &&
          route.distance_meters! <= policy.arrivalRouteMeters);
        if (arrived) this.cleanup();
        this.emit({ state: arrived ? "ARRIVED" : "ACTIVE", route, error: null,
          routeKey: JSON.stringify([destination.latitude, destination.longitude, mode, this.config.preference ?? "FASTEST"]),
          routeStale: false, updatedAt: this.now(), engaged: !arrived, following: !arrived && this.snapshot.following });
      }).catch((error: unknown) => {
        if (generation !== this.generation || controller.signal.aborted) return;
        this.pending = false;
        if (error instanceof RoutingClientError && error.kind === "AUTH") { this.sessionLost(); return; }
        this.emit({ state: "ERROR", route: null, error: error instanceof RoutingClientError && error.kind === "TIMEOUT"
          ? "Layanan rute tidak merespons tepat waktu. Coba lagi." : "Layanan rute sementara tidak tersedia." });
      });
  }
  private cancelRequest() { this.generation++; this.controller?.abort(); this.controller = null; this.pending = false; }
  private cleanup() {
    this.needsRoute = false;
    this.locationValid = false;
    this.recentFixes = [];
    this.latestObservedFix = null;
    this.lastObservedTimestamp = -Infinity;
    this.poorAccuracySamples = 0;
    this.session++;
    this.cancelRequest();
    if (this.watch !== null) this.geo?.clearWatch(this.watch);
    this.watch = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  stop = () => { this.cleanup(); this.emit({ ...initial, state: "STOPPED" }); };
  sessionLost = () => {
    if (this.snapshot.state === "PREVIEW" || this.snapshot.state === "STOPPED") return;
    this.cleanup();
    this.emit({ ...initial, state: "ERROR", authRequired: true, error: "Sesi berakhir. Masuk kembali untuk melanjutkan perjalanan." });
  };
  suspendFollow = () => { if (this.snapshot.following) this.emit({ following: false }); };
  focus = () => { if (this.snapshot.engaged && this.locationValid) this.emit({ following: true, focusKey: this.snapshot.focusKey + 1 }); };
  dispose = () => { this.cleanup(); };
}
