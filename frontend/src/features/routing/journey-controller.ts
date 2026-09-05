import { RoutingClientError, parseRoutingResult, type RoutePreference, type RoutingMode, type RoutingResult, type RoutingRequest } from "@/src/services/routing.service";
import type { Coordinate } from "@/src/types/spatial";
import { JOURNEY_POLICY as policy, proximityMeters, validCoordinate } from "./journey-policy";

export type JourneyState = "PREVIEW" | "REQUESTING_LOCATION" | "STARTING" | "ACTIVE" | "REROUTING" | "ARRIVED" | "STOPPED" | "ERROR";
export type JourneyFix = Coordinate & { accuracyMeters: number; capturedAt: string; timestamp: number };
export type JourneySnapshot = {
  state: JourneyState; engaged: boolean; position: JourneyFix | null; route: RoutingResult | null;
  error: string | null; authRequired: boolean; following: boolean; updatedAt: number | null; routeKey: string; focusKey: number;
};
type Config = { destination: Coordinate | null; mode: RoutingMode; preference?: RoutePreference };
type Dependencies = {
  geolocation: () => Pick<Geolocation, "watchPosition" | "clearWatch"> | null;
  authenticated: () => Promise<boolean>;
  route: (request: RoutingRequest, mode: RoutingMode, signal: AbortSignal) => Promise<RoutingResult>;
  now?: () => number;
};
const initial: JourneySnapshot = { state: "PREVIEW", engaged: false, position: null, route: null,
  error: null, authRequired: false, following: false, updatedAt: null, routeKey: "", focusKey: 0 };

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
    this.emit({ route: null, updatedAt: null });
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
    this.emit({ ...initial, engaged: true, state: "REQUESTING_LOCATION", following: true });
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
  private position(p: GeolocationPosition) {
    if (!this.snapshot.engaged) return;
    const fix: JourneyFix = { latitude: p.coords.latitude, longitude: p.coords.longitude,
      accuracyMeters: p.coords.accuracy, timestamp: p.timestamp, capturedAt: "" };
    if (!validCoordinate(fix) || !Number.isFinite(fix.timestamp) || fix.timestamp > this.now() + 1000 ||
      this.now() - fix.timestamp > policy.maximumFixAgeMs || !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters < 0) {
      this.locationError(2); return;
    }
    if (this.snapshot.position && fix.timestamp < this.snapshot.position.timestamp) return;
    if (fix.accuracyMeters > policy.maximumAccuracyMeters) {
      this.locationError(2);
      this.emit({ error: "Akurasi lokasi belum memadai. Menunggu sinyal GPS yang lebih baik." }); return;
    }
    fix.capturedAt = new Date(fix.timestamp).toISOString();
    const recovered = !this.locationValid;
    this.locationValid = true;
    this.emit({ position: fix, error: recovered ? null : this.snapshot.error });
    if (recovered) this.request(this.lastOrigin === null);
    else this.tick();
  }
  private locationError(code: number, terminal = false) {
    this.locationValid = false;
    this.cancelRequest();
    if (code === 1 || terminal) this.cleanup();
    this.emit({ state: "ERROR", route: null, updatedAt: null,
      engaged: code !== 1 && !terminal, following: code !== 1 && !terminal && this.snapshot.following,
      error: code === 1 ? "Izin lokasi diperlukan untuk memulai perjalanan."
        : code === 3 ? "Pengambilan lokasi terlalu lama. Menunggu GPS; coba lagi."
        : "Lokasi perangkat tidak tersedia. Periksa GPS dan izin lokasi." });
  }
  private tick() {
    const p = this.snapshot.position;
    if (!this.snapshot.engaged || !p || !this.locationValid) return;
    if (this.now() - p.timestamp > policy.maximumFixAgeMs) { this.locationError(3); return; }
    const moved = this.lastOrigin && proximityMeters(p, this.lastOrigin) >= policy.movementMeters[this.config.mode];
    if (moved || this.needsRoute) {
      if (moved && this.pending) this.cancelRequest();
      if (this.snapshot.route) this.emit({ route: null, updatedAt: null, state: "REROUTING" });
      this.request(false);
    }
  }
  refresh = () => {
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
    this.emit({ route: null, updatedAt: null, error: null, state: this.lastOrigin ? "REROUTING" : "STARTING" });
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
        const fresh = this.locationValid && this.now() - current.timestamp <= policy.maximumFixAgeMs;
        if (!fresh) { this.locationError(3); return; }
        const arrived = current.accuracyMeters <= policy.arrivalAccuracyMeters &&
          this.now() - origin.timestamp <= policy.maximumFixAgeMs &&
          proximityMeters(current, origin) <= policy.arrivalOriginDriftMeters &&
          proximityMeters(current, destination) <= policy.arrivalProximityMeters &&
          route.distance_meters! <= policy.arrivalRouteMeters;
        if (arrived) this.cleanup();
        this.emit({ state: arrived ? "ARRIVED" : "ACTIVE", route, error: null,
          routeKey: JSON.stringify([destination.latitude, destination.longitude, mode, this.config.preference ?? "FASTEST"]),
          updatedAt: this.now(), engaged: !arrived, following: !arrived && this.snapshot.following });
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
