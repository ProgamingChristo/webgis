"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { JourneyController } from "@/src/features/routing/journey-controller";
import { getAccessToken } from "@/src/lib/auth-client";
import { getBrowserSupabaseClient } from "@/src/lib/supabase/browser";
import { routingService, type RoutingMode } from "@/src/services/routing.service";
import type { Coordinate } from "@/src/types/spatial";

export function useActiveJourney(destination: Coordinate | null, mode: RoutingMode) {
  const [controller] = useState(() => new JourneyController({
    geolocation: () => typeof navigator !== "undefined" ? navigator.geolocation ?? null : null,
    authenticated: async () => Boolean(await getAccessToken()),
    route: routingService.getRoute,
  }));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const lat = destination?.latitude;
  const lon = destination?.longitude;
  useEffect(() => {
    controller.configure({ destination: lat !== undefined && lon !== undefined ? { latitude: lat, longitude: lon } : null, mode });
  }, [controller, lat, lon, mode]);
  useEffect(() => {
    const { data } = getBrowserSupabaseClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event === "TOKEN_REFRESHED")) controller.sessionLost();
    });
    return () => { data.subscription.unsubscribe(); controller.dispose(); };
  }, [controller]);
  // Do not expose a previous mode/destination during the render before configuration effects.
  const key = JSON.stringify([lat, lon, mode]);
  return { ...snapshot, route: snapshot.routeKey === key ? snapshot.route : null, controller };
}
