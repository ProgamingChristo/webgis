import {
  RoutingClientError,
  parseRoutingResult,
  type RoutePreference,
  type RouteProgressRequest,
  type RouteProgressResult,
  type RoutingMode,
  type RoutingRequest,
  type RoutingResult,
} from "@/src/services/routing.service";
import type { Coordinate } from "@/src/types/spatial";
import { JOURNEY_POLICY as policy, proximityMeters, validCoordinate } from "./journey-policy";

export type JourneyState = "PREVIEW" | "REQUESTING_LOCATION" | "STARTING" | "ACTIVE" | "REROUTING" | "ARRIVED" | "STOPPED" | "ERROR";
export type JourneyGpsState = "GPS_REQUESTING" | "GPS_GOOD" | "GPS_DEGRADED" | "GPS_STALE" | "GPS_UNAVAILABLE" | "GPS_PERMISSION_DENIED";
export type JourneyRouteMatch = "UNKNOWN" | "ON_ROUTE" | "OFF_ROUTE";
export type JourneyFix = Coordinate & {
  accuracyMeters: number;
  capturedAt: string;
  headingDegrees: number | null;
  speedMps: number | null;
  timestamp: number;
};
export type JourneySnapshot = {
  state: JourneyState; engaged: boolean; position: JourneyFix | null; route: RoutingResult | null;
  error: string | null; authRequired: boolean; following: boolean; updatedAt: number | null; routeKey: string; focusKey: number;
  gpsState: JourneyGpsState; gpsAccuracyMeters: number | null; routeStale: boolean;
  routeMatch: JourneyRouteMatch; progressFraction: number | null; distanceFromRouteMeters: number | null;
  nearbyUmkmVisible: boolean;
};
type Config = { destination: Coordinate | null; mode: RoutingMode; preference?: RoutePreference };
type Dependencies = {
  geolocation: () => Pick<Geolocation, "watchPosition" | "clearWatch"> | null;
  authenticated: () => Promise<boolean>;
  route: (request: RoutingRequest, mode: RoutingMode, signal: AbortSignal) => Promise<RoutingResult>;
  progress: (request: RouteProgressRequest, signal: AbortSignal) => Promise<RouteProgressResult>;
  now?: () => number;
};
const initial: JourneySnapshot = {
  state: "PREVIEW", engaged: false, position: null, route: null,
  error: null, authRequired: false, following: false, updatedAt: null, routeKey: "", focusKey: 0,
  gpsState: "GPS_UNAVAILABLE", gpsAccuracyMeters: null, routeStale: false,
  routeMatch: "UNKNOWN", progressFraction: null, distanceFromRouteMeters: null, nearbyUmkmVisible: false,
};

// One controller owns the GPS watch, active route, and request lifecycle.
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
  private activeRoute: RoutingResult | null = null;
  private lastProgressOrigin: JourneyFix | null = null;
  private lastRequestAt = -Infinity;
  private pending = false;
  private locationValid = false;
  private needsProgress = false;
  private recentFixes: JourneyFix[] = [];
  private latestObservedFix: JourneyFix | null = null;
  private lastObservedTimestamp = -Infinity;
  private poorAccuracySamples = 0;
  private consecutiveOffRouteSamples = 0;
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
    this.consecutiveOffRouteSamples = 0;
    this.cancelRequest();
    this.emit({ routeStale: false, routeMatch: "UNKNOWN", progressFraction: null });
    this.requestRoute(true);
  }
  start = async () => {
    if (this.snapshot.engaged || !validCoordinate(this.config.destination)) return;
    this.cleanup();
    const session = this.session;
    this.lastProgressOrigin = null;
    this.lastRequestAt = -Infinity;
    this.locationValid = false;
    this.needsProgress = false;
    this.recentFixes = [];
    this.latestObservedFix = null;
    this.lastObservedTimestamp = -Infinity;
    this.poorAccuracySamples = 0;
    this.consecutiveOffRouteSamples = 0;
    this.activeRoute = null;
    this.emit({ ...initial, engaged: true, state: "REQUESTING_LOCATION", following: true, gpsState: "GPS_REQUESTING" });
    let authenticated = false;
    try { authenticated = await this.deps.authenticated(); } catch { /* Sanitized below. */ }
    if (session !== this.session) return;
    if (!authenticated) { this.sessionLost(); return; }
    this.geo = this.deps.geolocation();
    if (!this.geo) { this.locationError(2, true); return; }
    this.timer = setInterval(() => this.tick(), 1_000);
    try {
      const watch = this.geo.watchPosition(
        (position) => { if (session === this.session) this.position(position); },
        (error) => { if (session === this.session) this.locationError(error.code); },
        policy.geolocation,
      );
      if (session !== this.session) this.geo?.clearWatch(watch); else this.watch = watch;
    } catch { this.locationError(2, true); }
  };
  private hasFreshAcceptedFix() {
    const fix = this.snapshot.position;
    return Boolean(fix && this.now() - fix.timestamp <= policy.maximumFixAgeMs && fix.accuracyMeters <= policy.maximumAccuracyMeters);
  }
  private selectRecentFix(latest: JourneyFix) {
    const cutoff = this.now() - policy.maximumFixAgeMs;
    this.recentFixes = [...this.recentFixes.filter((fix) => fix.timestamp >= cutoff), latest].slice(-policy.recentFixBufferSize);
    const best = this.recentFixes.reduce((candidate, fix) => fix.accuracyMeters < candidate.accuracyMeters ? fix : candidate, latest);
    const brieflyBetter = latest.timestamp - best.timestamp <= policy.bestFixHoldMs &&
      latest.accuracyMeters > best.accuracyMeters + policy.accuracyRegressionToleranceMeters;
    return brieflyBetter ? best : latest;
  }
  private degradeGps(gpsState: JourneyGpsState, error: string, accuracyMeters: number | null = null) {
    const freshAcceptedFix = this.hasFreshAcceptedFix();
    this.locationValid = freshAcceptedFix;
    if (!freshAcceptedFix) this.cancelRequest();
    this.emit({
      state: this.snapshot.route ? this.snapshot.state === "REROUTING" && freshAcceptedFix ? "REROUTING" : "ACTIVE" : "REQUESTING_LOCATION",
      engaged: true, gpsState, gpsAccuracyMeters: accuracyMeters,
      routeStale: !freshAcceptedFix && Boolean(this.snapshot.route), error,
    });
  }
  private position(position: GeolocationPosition) {
    if (!this.snapshot.engaged) return;
    const fix: JourneyFix = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
      headingDegrees: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
      speedMps: Number.isFinite(position.coords.speed) && (position.coords.speed ?? -1) >= 0 ? position.coords.speed : null,
      timestamp: position.timestamp,
      capturedAt: "",
    };
    if (!validCoordinate(fix) || !Number.isFinite(fix.timestamp) || fix.timestamp > this.now() + 1_000 ||
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
      this.degradeGps("GPS_DEGRADED", `GPS ditemukan, tetapi akurasinya belum cukup (±${Math.round(fix.accuracyMeters)} m).`, fix.accuracyMeters);
      return;
    }
    fix.capturedAt = new Date(fix.timestamp).toISOString();
    this.poorAccuracySamples = 0;
    const acceptedFix = this.selectRecentFix(fix);
    const recovered = !this.locationValid || this.snapshot.gpsState !== "GPS_GOOD";
    this.locationValid = true;
    this.emit({ position: acceptedFix, gpsState: "GPS_GOOD", gpsAccuracyMeters: acceptedFix.accuracyMeters, routeStale: false, error: null });
    if (!this.activeRoute) this.requestRoute(true);
    else if (recovered) this.requestProgress(false);
    else this.tick();
  }
  private locationError(code: number, terminal = false) {
    if (code === 1) {
      this.cleanup();
      this.emit({ ...initial, state: "ERROR", gpsState: "GPS_PERMISSION_DENIED", error: "Aktifkan izin lokasi untuk memulai navigasi." });
      return;
    }
    if (terminal) {
      this.cleanup();
      this.emit({ ...initial, state: "ERROR", gpsState: "GPS_UNAVAILABLE", error: "Perangkat atau browser belum mendukung lokasi." });
      return;
    }
    const stale = code === 3 && this.snapshot.position !== null;
    this.degradeGps(stale ? "GPS_STALE" : "GPS_UNAVAILABLE", stale
      ? "Data GPS sudah kedaluwarsa. Menunggu lokasi terbaru."
      : code === 3 ? "Pengambilan lokasi terlalu lama. Menunggu GPS yang lebih akurat."
        : "Lokasi perangkat sementara tidak tersedia. Periksa GPS dan izin lokasi.");
  }
  private tick() {
    const position = this.snapshot.position;
    if (!this.snapshot.engaged || !position) return;
    if (this.now() - position.timestamp > policy.maximumFixAgeMs) {
      if (this.snapshot.gpsState !== "GPS_STALE") this.locationError(3);
      return;
    }
    if (!this.locationValid || !this.activeRoute) return;
    const movementThreshold = policy.progressMovementMeters[this.config.mode];
    const uncertainty = this.lastProgressOrigin ? Math.min(Math.max(position.accuracyMeters, this.lastProgressOrigin.accuracyMeters), movementThreshold) : 0;
    const moved = this.lastProgressOrigin && proximityMeters(position, this.lastProgressOrigin) >= movementThreshold + uncertainty;
    if (moved || this.needsProgress) this.requestProgress(false);
  }
  refresh = () => {
    if (this.snapshot.gpsState !== "GPS_GOOD" || this.now() - this.lastRequestAt < policy.manualIntervalMs) return;
    this.requestRoute(true);
  };
  private requestRoute(immediate: boolean) {
    const origin = this.snapshot.position;
    const destination = this.config.destination;
    if (!this.snapshot.engaged || !origin || !validCoordinate(destination) || !this.locationValid) return;
    if (this.now() - origin.timestamp > policy.maximumFixAgeMs) { this.locationError(3); return; }
    if (!immediate && (this.pending || this.now() - this.lastRequestAt < policy.routeMinimumIntervalMs)) return;
    const previousRoute = this.snapshot.route;
    this.needsProgress = false;
    this.cancelRequest();
    const generation = this.generation;
    const mode = this.config.mode;
    const controller = new AbortController();
    this.controller = controller;
    this.pending = true;
    this.lastRequestAt = this.now();
    const rerouting = this.activeRoute !== null;
    this.emit({ ...(rerouting ? {} : { route: null, updatedAt: null }), error: null, routeStale: false, state: rerouting ? "REROUTING" : "STARTING" });
    void this.deps.route({
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: destination.latitude, longitude: destination.longitude },
      include_alternatives: true,
      route_preference: this.config.preference ?? "FASTEST",
    }, mode, controller.signal).then((value) => {
      if (generation !== this.generation || controller.signal.aborted) return;
      const route = parseRoutingResult(value, mode);
      this.pending = false;
      if (route.route_status !== "ROUTABLE") {
        this.handleRouteFailure(previousRoute, route.reason_code === "ROUTING_TIMEOUT"
          ? "Layanan rute tidak merespons tepat waktu. Coba lagi."
          : route.route_status === "SERVICE_UNAVAILABLE" ? "Layanan rute sementara tidak tersedia." : "Rute tidak ditemukan untuk lokasi dan moda ini.");
        return;
      }
      const current = this.snapshot.position!;
      if (!this.locationValid || this.now() - current.timestamp > policy.maximumFixAgeMs) { this.locationError(3); return; }
      this.activeRoute = route;
      this.lastProgressOrigin = origin;
      this.consecutiveOffRouteSamples = 0;
      const arrived = this.arrivedFromRoute(route, origin, destination);
      if (arrived) this.cleanup();
      this.emit({
        state: arrived ? "ARRIVED" : "ACTIVE", route, error: null, routeKey: this.routeKey(), routeStale: false,
        routeMatch: "ON_ROUTE", progressFraction: arrived ? 1 : 0, distanceFromRouteMeters: 0,
        updatedAt: this.now(), engaged: !arrived, following: !arrived,
        nearbyUmkmVisible: arrived ? false : this.snapshot.nearbyUmkmVisible,
      });
    }).catch((error: unknown) => {
      if (generation !== this.generation || controller.signal.aborted) return;
      this.pending = false;
      if (error instanceof RoutingClientError && error.kind === "AUTH") { this.sessionLost(); return; }
      this.handleRouteFailure(previousRoute, error instanceof RoutingClientError && error.kind === "TIMEOUT"
        ? "Layanan rute tidak merespons tepat waktu. Coba lagi." : "Layanan rute sementara tidak tersedia.");
    });
  }
  private requestProgress(immediate: boolean) {
    const position = this.snapshot.position;
    const route = this.activeRoute;
    if (!position || !route?.geometry || route.distance_meters === null || route.duration_seconds === null) return;
    const minimumInterval = policy.progressMinimumIntervalMs[this.config.mode];
    if (this.pending || (!immediate && this.now() - this.lastRequestAt < minimumInterval)) { this.needsProgress = true; return; }
    this.needsProgress = false;
    this.cancelRequest();
    const generation = this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.pending = true;
    this.lastRequestAt = this.now();
    this.lastProgressOrigin = position;
    void this.deps.progress({
      accuracy_meters: position.accuracyMeters,
      current_position: { latitude: position.latitude, longitude: position.longitude },
      mode: this.config.mode,
      route: { distance_meters: route.distance_meters, duration_seconds: route.duration_seconds, geometry: route.geometry, maneuvers: route.maneuvers },
    }, controller.signal).then((progress) => {
      if (generation !== this.generation || controller.signal.aborted) return;
      this.pending = false;
      if (!progress.on_route) {
        this.consecutiveOffRouteSamples += 1;
        this.emit({ routeMatch: "OFF_ROUTE", distanceFromRouteMeters: progress.distance_from_route_meters,
          error: this.consecutiveOffRouteSamples >= policy.offRouteConsecutiveSamples
            ? "Posisi berada di luar rute. Mencari rute baru..." : "Memeriksa posisi terhadap rute aktif..." });
        if (this.consecutiveOffRouteSamples >= policy.offRouteConsecutiveSamples) this.requestRoute(true);
        return;
      }
      this.consecutiveOffRouteSamples = 0;
      const projectedRoute: RoutingResult = {
        ...route,
        distance_meters: progress.remaining_distance_meters,
        duration_seconds: progress.remaining_duration_seconds,
        geometry: progress.remaining_geometry,
        maneuvers: progress.next_maneuver ? [progress.next_maneuver] : [],
        route_candidates: undefined,
        routes: undefined,
      };
      const arrived = this.arrivedFromProgress(progress, position);
      if (arrived) this.cleanup();
      this.emit({
        state: arrived ? "ARRIVED" : "ACTIVE", engaged: !arrived,
        following: !arrived && this.snapshot.following, nearbyUmkmVisible: arrived ? false : this.snapshot.nearbyUmkmVisible,
        route: projectedRoute, routeMatch: "ON_ROUTE", progressFraction: progress.progress_fraction,
        distanceFromRouteMeters: progress.distance_from_route_meters, updatedAt: this.now(), error: null,
      });
    }).catch((error: unknown) => {
      if (generation !== this.generation || controller.signal.aborted) return;
      this.pending = false;
      if (error instanceof RoutingClientError && error.kind === "AUTH") { this.sessionLost(); return; }
      this.emit({ state: "ACTIVE", error: "Kemajuan rute belum dapat diperbarui. Rute terakhir tetap ditampilkan." });
    });
  }
  private arrivedFromRoute(route: RoutingResult, origin: JourneyFix, destination: Coordinate) {
    const observed = this.latestObservedFix;
    return Boolean(observed && observed.accuracyMeters <= policy.arrivalAccuracyMeters &&
      this.now() - observed.timestamp <= policy.maximumFixAgeMs && proximityMeters(observed, origin) <= policy.arrivalOriginDriftMeters &&
      proximityMeters(observed, destination) <= policy.arrivalProximityMeters && route.distance_meters! <= policy.arrivalRouteMeters);
  }
  private arrivedFromProgress(progress: RouteProgressResult, position: JourneyFix) {
    return position.accuracyMeters <= policy.arrivalAccuracyMeters && progress.on_route &&
      progress.progress_fraction >= policy.arrivalProgressFraction && progress.remaining_distance_meters <= policy.arrivalRouteMeters;
  }
  private handleRouteFailure(previousRoute: RoutingResult | null, error: string) {
    if (previousRoute) this.emit({ state: "ACTIVE", route: previousRoute, error, routeStale: true });
    else { this.activeRoute = null; this.emit({ state: "ERROR", route: null, error }); }
  }
  private routeKey() {
    const destination = this.config.destination!;
    return JSON.stringify([destination.latitude, destination.longitude, this.config.mode, this.config.preference ?? "FASTEST"]);
  }
  private cancelRequest() { this.generation += 1; this.controller?.abort(); this.controller = null; this.pending = false; }
  private cleanup() {
    this.needsProgress = false; this.locationValid = false; this.recentFixes = []; this.latestObservedFix = null;
    this.lastObservedTimestamp = -Infinity; this.poorAccuracySamples = 0; this.consecutiveOffRouteSamples = 0;
    this.activeRoute = null; this.session += 1; this.cancelRequest();
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
  toggleNearbyUmkm = () => { if (this.snapshot.engaged) this.emit({ nearbyUmkmVisible: !this.snapshot.nearbyUmkmVisible }); };
  dispose = () => { this.cleanup(); };
}
