import "server-only";

import { createTimeoutFetch, type FetchImplementation } from "@/src/lib/http/timeout-fetch";
import type {
  NavigationManeuver,
  NavigationRouteCandidate,
  NavigationRouteRequest,
  NavigationRouteResult,
  RoutingMode,
  RoutingProvider,
} from "@/src/features/routing/routing.types";

type ValhallaResponse = {
  alternates?: Array<{ trip?: ValhallaTrip }>;
  error?: string;
  error_code?: number;
  error_message?: string;
  trip?: ValhallaTrip;
};

type ValhallaTrip = {
    legs?: Array<{
      maneuvers?: Array<{
        instruction?: string;
        length?: number;
        time?: number;
        type?: number;
      }>;
      shape?: string;
    }>;
    status?: number;
    status_message?: string;
    summary?: {
      has_ferry?: boolean;
      has_highway?: boolean;
      has_toll?: boolean;
      length?: number;
      time?: number;
    };
    warnings?: Array<{ description?: string; text?: string }>;
};

type ValhallaManeuver = {
  instruction?: string;
  length?: number;
  time?: number;
  type?: number;
};

const MODE_COSTING: Record<RoutingMode, "pedestrian" | "motorcycle" | "auto"> = {
  walking: "pedestrian",
  motorcycle: "motorcycle",
  car: "auto",
};

// Valhalla 171 means no routable edge can be correlated near an input point.
// Disconnected regions and path/match failures have valid graph correlation,
// so they are an unroutable pair rather than coordinates outside the graph.
const NO_ROUTE_CODES = new Set([170, 442, 443, 444]);
const OUTSIDE_GRAPH_CODES = new Set([171]);

export class ValhallaRoutingProvider implements RoutingProvider {
  private readonly fetchWithTimeout: FetchImplementation;

  constructor(
    private readonly baseUrl: string,
    fetchImplementation: FetchImplementation = globalThis.fetch,
    timeoutMs = 12_000,
  ) {
    this.baseUrl = validateBaseUrl(baseUrl);
    this.fetchWithTimeout = createTimeoutFetch(timeoutMs, fetchImplementation);
  }

  async route(
    input: NavigationRouteRequest,
    signal?: AbortSignal,
  ): Promise<NavigationRouteResult> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/route`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "user-agent": "GETRA/0.1 routing-service",
      },
      body: JSON.stringify({
        locations: [
          { lat: input.origin.latitude, lon: input.origin.longitude, type: "break" },
          { lat: input.destination.latitude, lon: input.destination.longitude, type: "break" },
        ],
        costing: MODE_COSTING[input.mode],
        costing_options: costingOptions(input.mode),
        directions_type: "instructions",
        language: "id-ID",
        units: "kilometers",
        alternates: input.includeAlternatives ? 2 : 0,
      }),
      signal,
    });

    const payload = await readJson(response);
    if (!response.ok || payload.error || payload.error_code) {
      return failedRoute(
        input.mode,
        classifyFailure(payload),
        failureWarning(payload),
        failureReason(payload),
      );
    }

    return normalizeRoute(input.mode, payload);
  }
}

function costingOptions(mode: RoutingMode) {
  if (mode === "walking") {
    return { pedestrian: { use_ferry: 0.2, walkway_factor: 0.9, sidewalk_factor: 0.9 } };
  }
  if (mode === "motorcycle") {
    return { motorcycle: { use_ferry: 0.2, use_highways: 0.25, use_tolls: 0.1, use_trails: 0 } };
  }
  return { auto: { use_ferry: 0.2, use_highways: 0.65, use_tolls: 0.5 } };
}

function normalizeRoute(mode: RoutingMode, payload: ValhallaResponse): NavigationRouteResult {
  const primary = normalizeCandidate(mode, payload.trip, 0, true);
  if (!primary) {
    return failedRoute(
      mode,
      "SERVICE_UNAVAILABLE",
      "Provider tidak mengembalikan rute yang dapat digunakan.",
      "ROUTING_PROVIDER_INVALID_RESPONSE",
    );
  }
  const candidates = [primary, ...(payload.alternates ?? []).flatMap((alternate, index) => {
    const candidate = normalizeCandidate(mode, alternate.trip, index + 1, false);
    return candidate ? [candidate] : [];
  })];
  return {
    ...candidateResult(primary),
    route_candidates: candidates,
    route_preference: "FASTEST",
    selected_route_id: primary.route_id,
    umkm_preference_available: false,
    umkm_enrichment_status: "NOT_REQUESTED",
  };
}

function normalizeCandidate(
  mode: RoutingMode,
  trip: ValhallaTrip | undefined,
  rank: number,
  primary: boolean,
): NavigationRouteCandidate | null {
  const summary = trip?.summary;
  const encodedShapes = trip?.legs?.map((leg) => leg.shape).filter(isNonEmptyString) ?? [];
  let geometry: ReturnType<typeof combineShapes>;
  try {
    geometry = combineShapes(encodedShapes);
  } catch {
    return null;
  }
  const distanceMeters = finiteNumber(summary?.length) * 1_000;
  const durationSeconds = finiteNumber(summary?.time);

  if (!geometry || distanceMeters <= 0 || durationSeconds <= 0) return null;
  return {
    distance_meters: Math.round(distanceMeters),
    duration_seconds: Math.round(durationSeconds),
    geometry,
    has_ferry: Boolean(summary?.has_ferry),
    has_highway: Boolean(summary?.has_highway),
    has_toll: Boolean(summary?.has_toll),
    maneuvers: (trip?.legs ?? []).flatMap((leg) => normalizeManeuvers(leg.maneuvers)),
    mode,
    is_primary: primary,
    nearby_umkm_count: null,
    route_category: primary ? "FASTEST" : "ALTERNATIVE",
    route_id: `route-${rank}`,
    route_rank: rank,
    verified_umkm_count: null,
    distinct_category_count: null,
  };
}

function candidateResult(candidate: NavigationRouteCandidate): NavigationRouteResult {
  return {
    distance_meters: candidate.distance_meters,
    duration_seconds: candidate.duration_seconds,
    engine: "valhalla",
    geometry: candidate.geometry,
    has_ferry: candidate.has_ferry,
    has_highway: candidate.has_highway,
    has_toll: candidate.has_toll,
    maneuvers: candidate.maneuvers,
    mode: candidate.mode,
    reason_code: null,
    route_status: "ROUTABLE",
    source: "OPENSTREETMAP",
    warnings: [],
  };
}

function normalizeManeuvers(value: ValhallaManeuver[] | undefined): NavigationManeuver[] {
  return (value ?? []).flatMap((maneuver) => {
    if (!isNonEmptyString(maneuver.instruction)) return [];
    return [{
      distance_meters: Math.round(finiteNumber(maneuver.length) * 1_000),
      instruction: maneuver.instruction,
      time_seconds: Math.round(finiteNumber(maneuver.time)),
      type: Number.isInteger(maneuver.type) ? maneuver.type! : null,
    }];
  });
}

function combineShapes(shapes: string[]) {
  const coordinates = shapes.flatMap((shape, index) => {
    const decoded = decodePolyline6(shape);
    return index === 0 ? decoded : decoded.slice(1);
  });
  return coordinates.length >= 2
    ? { type: "LineString" as const, coordinates }
    : null;
}

export function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeDelta = decodeValue(encoded, index);
    index = latitudeDelta.nextIndex;
    const longitudeDelta = decodeValue(encoded, index);
    index = longitudeDelta.nextIndex;
    latitude += latitudeDelta.value;
    longitude += longitudeDelta.value;
    coordinates.push([longitude / 1e6, latitude / 1e6]);
  }

  return coordinates;
}

function decodeValue(encoded: string, startIndex: number) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte: number;

  do {
    if (index >= encoded.length) throw new Error("VALHALLA_INVALID_SHAPE");
    byte = encoded.charCodeAt(index++) - 63;
    if (byte < 0 || byte > 63) throw new Error("VALHALLA_INVALID_SHAPE");
    result |= (byte & 0x1f) << shift;
    shift += 5;
    if (shift > 30) throw new Error("VALHALLA_INVALID_SHAPE");
  } while (byte >= 0x20);

  return { nextIndex: index, value: result & 1 ? ~(result >> 1) : result >> 1 };
}

function failedRoute(
  mode: RoutingMode,
  routeStatus: NavigationRouteResult["route_status"],
  warning: string,
  reasonCode: NavigationRouteResult["reason_code"],
): NavigationRouteResult {
  return {
    distance_meters: null,
    duration_seconds: null,
    engine: "valhalla",
    geometry: null,
    has_ferry: false,
    has_highway: false,
    has_toll: false,
    maneuvers: [],
    mode,
    reason_code: reasonCode,
    route_status: routeStatus,
    source: "OPENSTREETMAP",
    warnings: [warning],
  };
}

function failureReason(payload: ValhallaResponse): NonNullable<NavigationRouteResult["reason_code"]> {
  const status = classifyFailure(payload);
  if (status === "OUTSIDE_GRAPH") return "COORDINATES_OUTSIDE_GRAPH";
  if (status === "UNROUTABLE") return "NO_ROUTE_FOUND";
  if (payload.error === "INVALID_PROVIDER_RESPONSE") return "ROUTING_PROVIDER_INVALID_RESPONSE";
  return "ROUTING_UPSTREAM_ERROR";
}

function classifyFailure(payload: ValhallaResponse): NavigationRouteResult["route_status"] {
  if (OUTSIDE_GRAPH_CODES.has(payload.error_code ?? -1)) return "OUTSIDE_GRAPH";
  if (NO_ROUTE_CODES.has(payload.error_code ?? -1)) return "UNROUTABLE";
  return "SERVICE_UNAVAILABLE";
}

function failureWarning(payload: ValhallaResponse) {
  if (classifyFailure(payload) === "OUTSIDE_GRAPH") return "Titik berada di luar cakupan graph navigasi.";
  if (classifyFailure(payload) === "UNROUTABLE") return "Tidak ditemukan rute untuk mode ini.";
  return "Layanan navigasi sedang tidak tersedia.";
}

async function readJson(response: Response): Promise<ValhallaResponse> {
  try {
    return await response.json() as ValhallaResponse;
  } catch {
    return { error: "INVALID_PROVIDER_RESPONSE" };
  }
}

function validateBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("ROUTING_BASE_URL must use http or https");
  }
  return url.toString().replace(/\/$/, "");
}

function finiteNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
