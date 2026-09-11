"use client";

import { useSyncExternalStore } from "react";
import {
  CommuterLocationAuthority,
  sharedCommuterLocationAuthority,
} from "./commuter-location-authority";
import type { CommuterLocationSnapshot } from "./commuter-location.types";

export function useCommuterLocation(
  authority: CommuterLocationAuthority = sharedCommuterLocationAuthority,
): CommuterLocationSnapshot & {
  startTracking: () => void;
  stopTracking: () => void;
  refresh: () => void;
  recordQueryCoordinate: (coord: { latitude: number; longitude: number }) => void;
  hasMovedSignificantly: (coord?: { latitude: number; longitude: number } | null) => boolean;
} {
  const snapshot = useSyncExternalStore(
    authority.subscribe,
    authority.getSnapshot,
    authority.getSnapshot,
  );

  return {
    ...snapshot,
    startTracking: authority.startTracking,
    stopTracking: authority.stopTracking,
    refresh: authority.refresh,
    recordQueryCoordinate: authority.recordQueryCoordinate,
    hasMovedSignificantly: authority.hasMovedSignificantly,
  };
}
