import { useState, useCallback } from "react";
import { routingService, type RoutingResult } from "../services/routing.service";
import type { Coordinate } from "@/src/types/spatial";

type RoutingState = "IDLE" | "LOADING" | "SUCCESS" | "NO_ROUTE" | "ERROR";

export function useRouting() {
  const [state, setState] = useState<RoutingState>("IDLE");
  const [route, setRoute] = useState<RoutingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createFallbackRoute = useCallback(
    (
      origin: Coordinate,
      destination: Coordinate,
    ): RoutingResult => {
      const distanceMeters =
        calculateDistanceMeters(
          origin,
          destination,
        );

      return {
        analysis_method:
          "direct_line_fallback",
        distance_meters:
          distanceMeters,
        duration_seconds:
          Math.max(
            60,
            Math.round(
              distanceMeters / 1.25,
            ),
          ),
        geometry: {
          type: "LineString",
          coordinates: [
            [
              origin.longitude,
              origin.latitude,
            ],
            [
              destination.longitude,
              destination.latitude,
            ],
          ],
        },
        limitation_flags: [
          "ESTIMATED_DIRECT_LINE",
          "PEDESTRIAN_NETWORK_NOT_AVAILABLE",
        ],
        route_source:
          "fallback_direct_line",
        source:
          "GETRA client fallback",
      };
    },
    [],
  );

  const requestRoute = useCallback(async (origin: Coordinate, destination: Coordinate) => {
    setState("LOADING");
    setError(null);
    setRoute(null);

    try {
      const result = await routingService.getWalkingRoute({ origin, destination });
      setRoute(result);
      setState("SUCCESS");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghitung rute.";

      if (message.includes("ROUTING_GRAPH_NOT_AVAILABLE") || message.includes("SPATIAL_NETWORK_NOT_READY")) {
        setRoute(
          createFallbackRoute(
            origin,
            destination,
          ),
        );
        setState("NO_ROUTE");
        setError("Jaringan pejalan kaki belum tersedia untuk pasangan titik ini. GETRA menampilkan garis estimasi langsung sebagai preview.");
      } else {
        setState("ERROR");
        setError(message);
      }
    }
  }, [
    createFallbackRoute,
  ]);

  const clearRoute = useCallback(() => {
    setState("IDLE");
    setRoute(null);
    setError(null);
  }, []);

  return {
    state,
    route,
    error,
    requestRoute,
    clearRoute
  };
}

function calculateDistanceMeters(
  origin: Coordinate,
  destination: Coordinate,
) {
  const earthRadiusMeters =
    6371008.8;

  const toRad =
    (value: number) =>
      (value * Math.PI) /
      180;

  const dLat =
    toRad(
      destination.latitude -
        origin.latitude,
    );

  const dLng =
    toRad(
      destination.longitude -
        origin.longitude,
    );

  const lat1 =
    toRad(
      origin.latitude,
    );

  const lat2 =
    toRad(
      destination.latitude,
    );

  const h =
    Math.sin(
      dLat / 2,
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        dLng / 2,
      ) ** 2;

  return Math.round(
    earthRadiusMeters *
      2 *
      Math.atan2(
        Math.sqrt(h),
        Math.sqrt(
          1 - h,
        ),
      ),
  );
}
