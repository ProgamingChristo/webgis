import { useState, useCallback, useEffect, useRef } from "react";
import {
  ROUTING_MODES,
  routingService,
  type RoutingMode,
  type RoutingResult,
} from "../services/routing.service";
import type { Coordinate } from "@/src/types/spatial";
import {
  recommendRoutingMode,
  type RoutingRecommendationContext,
} from "@/src/features/routing/routing-recommendation";

type RoutingState = "IDLE" | "LOADING" | "SUCCESS" | "NO_ROUTE" | "ERROR";

export function useRouting() {
  const [state, setState] = useState<RoutingState>("IDLE");
  const [route, setRoute] = useState<RoutingResult | null>(null);
  const [routes, setRoutes] = useState<Partial<Record<RoutingMode, RoutingResult>>>({});
  const [activeMode, setActiveModeState] = useState<RoutingMode>("walking");
  const [recommendedMode, setRecommendedMode] = useState<RoutingMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const requestSequenceRef = useRef(0);

  const requestRoute = useCallback(async (
    origin: Coordinate,
    destination: Coordinate,
    destinationMerchantId?: string,
    context: RoutingRecommendationContext = {},
  ) => {
    activeRequestRef.current?.controller.abort();
    const id = ++requestSequenceRef.current;
    const controller = new AbortController();
    activeRequestRef.current = { id, controller };
    setState("LOADING");
    setError(null);
    setRoute(null);
    setRoutes({});
    setRecommendedMode(null);

    try {
      const settled = await Promise.allSettled(ROUTING_MODES.map((mode) =>
        routingService.getRoute({
          origin,
          destination,
          destination_merchant_id: destinationMerchantId,
        }, mode, controller.signal),
      ));
      if (activeRequestRef.current?.id !== id) return;

      const nextRoutes: Partial<Record<RoutingMode, RoutingResult>> = {};
      settled.forEach((entry, index) => {
        const mode = ROUTING_MODES[index];
        nextRoutes[mode] = entry.status === "fulfilled"
          ? entry.value
          : unavailableRoute(mode);
      });
      const recommendation = recommendRoutingMode(nextRoutes, context);
      const firstAvailable = recommendation ?? ROUTING_MODES.find((mode) =>
        nextRoutes[mode]?.route_status === "ROUTABLE" && nextRoutes[mode]?.geometry
      ) ?? null;

      setRoutes(nextRoutes);
      setRecommendedMode(recommendation);
      if (!firstAvailable) {
        setState("NO_ROUTE");
        setError(allModesUnavailableMessage(nextRoutes));
        return;
      }
      setActiveModeState(firstAvailable);
      setRoute(nextRoutes[firstAvailable] ?? null);
      setState("SUCCESS");
    } catch (err: unknown) {
      if (controller.signal.aborted || activeRequestRef.current?.id !== id) return;
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghitung rute.";

      setState("ERROR");
      setError(message);
    } finally {
      if (activeRequestRef.current?.id === id) activeRequestRef.current = null;
    }
  }, []);

  const clearRoute = useCallback(() => {
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setState("IDLE");
    setRoute(null);
    setRoutes({});
    setRecommendedMode(null);
    setError(null);
  }, []);

  useEffect(() => () => activeRequestRef.current?.controller.abort(), []);

  const setActiveMode = useCallback((mode: RoutingMode) => {
    setActiveModeState(mode);
    const nextRoute = routes[mode];
    if (nextRoute?.route_status === "ROUTABLE" && nextRoute.geometry) {
      setRoute(nextRoute);
      setError(null);
    } else {
      setRoute(null);
      setError(modeUnavailableMessage(mode, nextRoute));
    }
  }, [routes]);

  return {
    state,
    route,
    routes,
    activeMode,
    recommendedMode,
    setActiveMode,
    error,
    requestRoute,
    clearRoute
  };
}

function modeUnavailableMessage(mode: RoutingMode, result?: RoutingResult) {
  const label = mode === "walking" ? "jalan kaki" : mode === "motorcycle" ? "motor" : "mobil";
  if (result?.reason_code === "ROUTING_TIMEOUT") {
    return `Layanan rute ${label} tidak merespons tepat waktu. Coba lagi.`;
  }
  if (result?.route_status === "OUTSIDE_GRAPH") return `Titik berada di luar cakupan rute ${label}.`;
  if (result?.route_status === "SERVICE_UNAVAILABLE") return `Layanan rute ${label} sedang tidak tersedia.`;
  return `Rute ${label} tidak tersedia untuk lokasi ini.`;
}

function allModesUnavailableMessage(routes: Partial<Record<RoutingMode, RoutingResult>>) {
  const failures = ROUTING_MODES.map((mode) => routes[mode]).filter(
    (result): result is RoutingResult => Boolean(result),
  );
  if (failures.some((result) => result.reason_code === "ROUTING_TIMEOUT")) {
    return "Layanan routing tidak merespons tepat waktu. Coba lagi beberapa saat lagi.";
  }
  if (failures.every((result) => result.route_status === "OUTSIDE_GRAPH")) {
    return "Titik awal atau tujuan berada di luar cakupan jaringan routing.";
  }
  if (failures.some((result) =>
    result.reason_code === "ROUTING_PROVIDER_UNCONFIGURED" ||
    result.reason_code === "ROUTING_PROVIDER_UNREACHABLE" ||
    result.reason_code === "ROUTING_UPSTREAM_ERROR" ||
    result.reason_code === "ROUTING_PROVIDER_INVALID_RESPONSE"
  )) {
    return "Layanan routing GETRA sedang tidak tersedia. Coba lagi setelah koneksi provider pulih.";
  }
  return "Rute belum tersedia untuk lokasi ini pada semua mode transportasi.";
}

function unavailableRoute(mode: RoutingMode): RoutingResult {
  return {
    mode,
    reason_code: "ROUTING_PROVIDER_UNREACHABLE",
    route_status: "SERVICE_UNAVAILABLE",
    analysis_method: "navigation_route",
    distance_meters: null,
    duration_seconds: null,
    geometry: null,
    maneuvers: [],
    engine: "valhalla",
    warnings: ["Layanan navigasi sedang tidak tersedia."],
    has_toll: false,
    has_highway: false,
    has_ferry: false,
    limitation_flags: ["NO_FABRICATED_ROUTE"],
    route_source: "valhalla",
    source: "OPENSTREETMAP",
  };
}
