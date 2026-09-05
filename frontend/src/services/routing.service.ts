import { ApiError, apiClient } from "@/src/lib/api-client";
import { AuthSessionError } from "@/src/lib/auth-client";
import { isRouteGeometry } from "@/src/features/routing/route-geometry";
import { z } from "zod";
import type { Coordinate, LineStringGeometry } from "@/src/types/spatial";

export interface RoutingRequest {
  origin: Coordinate;
  destination: Coordinate;
  destination_merchant_id?: string;
}

export const ROUTING_MODES = ["walking", "motorcycle", "car"] as const;
export type RoutingMode = (typeof ROUTING_MODES)[number];

export interface RoutingManeuver {
  distance_meters: number;
  instruction: string;
  time_seconds: number;
  type: number | null;
}

export interface RoutingResult {
  route_status: "ROUTABLE" | "UNROUTABLE" | "OUTSIDE_GRAPH" | "SERVICE_UNAVAILABLE";
  mode: RoutingMode;
  reason_code:
    | "COORDINATES_OUTSIDE_GRAPH"
    | "NO_ROUTE_FOUND"
    | "ROUTING_PROVIDER_INVALID_RESPONSE"
    | "ROUTING_PROVIDER_UNCONFIGURED"
    | "ROUTING_PROVIDER_UNREACHABLE"
    | "ROUTING_REQUEST_ABORTED"
    | "ROUTING_TIMEOUT"
    | "ROUTING_UPSTREAM_ERROR"
    | null;
  analysis_method: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  geometry: LineStringGeometry | null;
  maneuvers: RoutingManeuver[];
  engine: string;
  warnings: string[];
  has_toll: boolean;
  has_highway: boolean;
  has_ferry: boolean;
  limitation_flags: string[];
  route_source: string;
  source: string;
}

export interface NearestTransportRequest {
  origin: Coordinate;
  radius_meters?: number;
}

export interface NearestTransportResult {
  analysis_method: string;
  radius_meters: number;
  records: unknown[];
  returned_count: number;
  source: string;
}

export class RoutingClientError extends Error {
  constructor(public readonly kind: "AUTH" | "VALIDATION" | "UNAVAILABLE" | "TIMEOUT" | "INVALID_RESPONSE") {
    super(kind);
    this.name = "RoutingClientError";
  }
}

const coordinateSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});
const responseSchema = z.object({
  route_status: z.enum(["ROUTABLE", "UNROUTABLE", "OUTSIDE_GRAPH", "SERVICE_UNAVAILABLE"]),
  mode: z.enum(ROUTING_MODES),
  reason_code: z.string().nullable(),
  distance_meters: z.number().finite().nullable(),
  duration_seconds: z.number().finite().nullable(),
  geometry: z.unknown(),
  maneuvers: z.array(z.object({ distance_meters: z.number().finite(), instruction: z.string(), time_seconds: z.number().finite(), type: z.number().nullable() })),
  warnings: z.array(z.string()),
  limitation_flags: z.array(z.string()),
  engine: z.string(), analysis_method: z.string(), route_source: z.string(), source: z.string(),
  has_toll: z.boolean(), has_highway: z.boolean(), has_ferry: z.boolean(),
});

export function parseRoutingResult(value: unknown, mode: RoutingMode): RoutingResult {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success || parsed.data.mode !== mode) throw new RoutingClientError("INVALID_RESPONSE");
  const result = parsed.data;
  if (result.route_status === "ROUTABLE") {
    if (!(result.distance_meters !== null && result.distance_meters > 0 &&
      result.duration_seconds !== null && result.duration_seconds > 0 && isRouteGeometry(result.geometry))) {
      throw new RoutingClientError("INVALID_RESPONSE");
    }
  } else if (result.geometry != null || result.distance_meters != null || result.duration_seconds != null) {
    throw new RoutingClientError("INVALID_RESPONSE");
  }
  return result as RoutingResult;
}

export const routingService = {
  async getRoute(
    request: RoutingRequest,
    mode: RoutingMode,
    signal?: AbortSignal,
  ): Promise<RoutingResult> {
    if (!coordinateSchema.safeParse(request.origin).success ||
      !coordinateSchema.safeParse(request.destination).success || !ROUTING_MODES.includes(mode)) {
      throw new RoutingClientError("VALIDATION");
    }
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20_000);
    try {
      const result = await apiClient.post<unknown>("/api/routing", {
        origin: request.origin,
        destination: request.destination,
        mode,
        ...(request.destination_merchant_id && z.uuid().safeParse(request.destination_merchant_id).success
          ? { destination_merchant_id: request.destination_merchant_id } : {}),
      }, { signal: controller.signal });
      return parseRoutingResult(result, mode);
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timedOut) throw new RoutingClientError("TIMEOUT");
      if (error instanceof RoutingClientError) throw error;
      if (error instanceof AuthSessionError || (error instanceof ApiError && error.status === 401)) throw new RoutingClientError("AUTH");
      if (error instanceof ApiError && error.status === 400) throw new RoutingClientError("VALIDATION");
      if (error instanceof ApiError && error.code === "INVALID_RESPONSE" && error.status < 500) throw new RoutingClientError("INVALID_RESPONSE");
      throw new RoutingClientError("UNAVAILABLE");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  },

  async getNearestTransport(request: NearestTransportRequest): Promise<NearestTransportResult> {
    return apiClient.post<NearestTransportResult>(
      "/api/transport/nearest",
      request
    );
  }
};
