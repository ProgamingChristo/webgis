export type CommuterLocationState =
  | "IDLE"
  | "REQUESTING"
  | "ACTIVE"
  | "DEGRADED"
  | "STALE"
  | "DENIED"
  | "UNAVAILABLE";

export interface CommuterFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: number;
  capturedAt: string;
}

export interface CommuterLocationSnapshot {
  state: CommuterLocationState;
  fix: CommuterFix | null;
  error: string | null;
  lastQueryCoordinate: { latitude: number; longitude: number } | null;
  isTracking: boolean;
  updatedAt: number | null;
}

export type LocationMovementListener = (fix: CommuterFix) => void;

export interface CommuterLocationPolicy {
  maximumAccuracyMeters: number;
  maximumFixAgeMs: number;
  movementThresholdMeters: number;
  debounceMs: number;
  geolocation: PositionOptions;
}

export const COMMUTER_LOCATION_POLICY: CommuterLocationPolicy = {
  maximumAccuracyMeters: 50,
  maximumFixAgeMs: 30_000,
  movementThresholdMeters: 50,
  debounceMs: 600,
  geolocation: {
    enableHighAccuracy: true,
    timeout: 12_000,
    maximumAge: 0,
  },
};
