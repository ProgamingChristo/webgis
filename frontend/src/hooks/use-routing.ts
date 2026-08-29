import { useState, useCallback, useEffect, useRef } from "react";
import { routingService, type RoutingResult } from "../services/routing.service";
import type { Coordinate } from "@/src/types/spatial";

type RoutingState = "IDLE" | "LOADING" | "SUCCESS" | "NO_ROUTE" | "ERROR";

export function useRouting() {
  const [state, setState] = useState<RoutingState>("IDLE");
  const [route, setRoute] = useState<RoutingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const requestSequenceRef = useRef(0);

  const requestRoute = useCallback(async (
    origin: Coordinate,
    destination: Coordinate,
    destinationMerchantId?: string,
  ) => {
    activeRequestRef.current?.controller.abort();
    const id = ++requestSequenceRef.current;
    const controller = new AbortController();
    activeRequestRef.current = { id, controller };
    setState("LOADING");
    setError(null);
    setRoute(null);

    try {
      const result = await routingService.getWalkingRoute({
        origin,
        destination,
        destination_merchant_id: destinationMerchantId,
      }, controller.signal);
      if (activeRequestRef.current?.id !== id) return;
      if (result.route_status !== "ROUTABLE" || !result.geometry) {
        setState("NO_ROUTE");
        setError("Rute pejalan kaki tidak tersedia untuk titik ini.");
        return;
      }
      setRoute(result);
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
    setError(null);
  }, []);

  useEffect(() => () => activeRequestRef.current?.controller.abort(), []);

  return {
    state,
    route,
    error,
    requestRoute,
    clearRoute
  };
}
