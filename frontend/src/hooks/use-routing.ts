"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { RoutingClientError, routingService, type RoutingMode, type RoutingResult } from "../services/routing.service";
import type { Coordinate } from "@/src/types/spatial";

export type RoutingState = "IDLE" | "LOADING" | "ROUTABLE" | "NOT_ROUTABLE" | "SERVICE_UNAVAILABLE" | "ERROR";
type Snapshot = { identity: object; state: RoutingState; route: RoutingResult | null; error: string | null; authRequired: boolean };

export function useRouting(input: { origin: Coordinate | null; destination: Coordinate | null; destinationMerchantId?: string }) {
  const [activeMode, setActiveMode] = useState<RoutingMode>("walking");
  const [attempt, setAttempt] = useState(0);
  const [clearedKey, setClearedKey] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const sequence = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const originLat = input.origin?.latitude;
  const originLon = input.origin?.longitude;
  const destinationLat = input.destination?.latitude;
  const destinationLon = input.destination?.longitude;
  const merchantId = input.destinationMerchantId;
  const ready = [originLat, originLon, destinationLat, destinationLon].every(Number.isFinite);
  const key = JSON.stringify([originLat, originLon, destinationLat, destinationLon, activeMode, merchantId, attempt]);
  const identity = useMemo(() => ({ key }), [key]);

  useEffect(() => {
    const id = ++sequence.current;
    if (!ready || key === clearedKey) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    void routingService.getRoute({
      origin: { latitude: originLat!, longitude: originLon! },
      destination: { latitude: destinationLat!, longitude: destinationLon! },
      destination_merchant_id: merchantId,
    }, activeMode, controller.signal).then((route) => {
      if (controller.signal.aborted || sequence.current !== id) return;
      const routable = route.route_status === "ROUTABLE";
      const unavailable = route.route_status === "SERVICE_UNAVAILABLE";
      setSnapshot({ identity, route: routable ? route : null, authRequired: false,
        state: routable ? "ROUTABLE" : unavailable ? "SERVICE_UNAVAILABLE" : "NOT_ROUTABLE",
        error: routable ? null : route.reason_code === "ROUTING_TIMEOUT"
          ? "Layanan rute tidak merespons tepat waktu. Coba lagi."
          : unavailable ? "Layanan rute sementara tidak tersedia."
          : route.route_status === "OUTSIDE_GRAPH" ? "Titik berada di luar cakupan rute."
          : "Rute tidak ditemukan untuk titik dan moda ini.",
      });
    }).catch((error: unknown) => {
      if (controller.signal.aborted || sequence.current !== id) return;
      const kind = error instanceof RoutingClientError ? error.kind : "UNAVAILABLE";
      setSnapshot({ identity, route: null, authRequired: kind === "AUTH",
        state: kind === "AUTH" || kind === "VALIDATION" ? "ERROR" : "SERVICE_UNAVAILABLE",
        error: kind === "AUTH" ? "Sesi berakhir. Masuk kembali untuk menghitung rute."
          : kind === "VALIDATION" ? "Koordinat atau pilihan rute tidak valid."
          : kind === "TIMEOUT" ? "Layanan rute tidak merespons tepat waktu. Coba lagi."
          : "Layanan rute sementara tidak tersedia.",
      });
    });
    return () => { controller.abort(); };
  }, [ready, key, identity, clearedKey, originLat, originLon, destinationLat, destinationLon, merchantId, activeMode]);

  const requestRoute = useCallback(() => setAttempt((value) => value + 1), []);
  const clearRoute = useCallback(() => {
    controllerRef.current?.abort();
    sequence.current += 1;
    setClearedKey(key);
    setSnapshot(null);
  }, [key]);

  // Hide old geometry immediately when input identity changes, before effects run.
  const current = snapshot?.identity === identity ? snapshot : null;
  const idle = !ready || key === clearedKey;
  return {
    state: idle ? "IDLE" as const : current?.state ?? "LOADING" as const,
    route: idle ? null : current?.route ?? null,
    error: idle ? null : current?.error ?? null,
    authRequired: !idle && Boolean(current?.authRequired),
    activeMode, setActiveMode, requestRoute, clearRoute,
  };
}
