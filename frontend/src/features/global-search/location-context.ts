import type { MapViewportBounds } from "@/src/services/mapid-layer.service";
import type { UserLocation } from "@/types/getra";

export const DEFAULT_NEARBY_RADIUS_METERS = 2_000;

export function canRequestAutoLocation(
  permissionState: PermissionState | null,
): boolean {
  return permissionState !== "denied";
}

type AutoLocationBootstrapOptions = {
  started: { current: boolean };
  geolocationSupported: boolean;
  getPermissionState?: () => Promise<PermissionState>;
  onDenied: () => void;
  onRequest: () => void;
  onUnsupported: () => void;
};

export async function requestAutoLocationOnce({
  started,
  geolocationSupported,
  getPermissionState,
  onDenied,
  onRequest,
  onUnsupported,
}: AutoLocationBootstrapOptions): Promise<boolean> {
  if (started.current) return false;
  started.current = true;

  if (!geolocationSupported) {
    onUnsupported();
    return false;
  }

  let permissionState: PermissionState | null = null;
  try {
    permissionState = getPermissionState ? await getPermissionState() : null;
  } catch {
    // Continue when a browser exposes Permissions API but rejects this query.
  }

  if (!canRequestAutoLocation(permissionState)) {
    onDenied();
    return false;
  }

  onRequest();
  return true;
}

export function boundsAroundLocation(
  location: Pick<UserLocation, "latitude" | "longitude">,
  radiusMeters: number,
): MapViewportBounds {
  const boundedRadius = Math.min(Math.max(radiusMeters, 250), 10_000);
  const latitudePadding = boundedRadius / 111_320;
  const longitudeScale = Math.max(Math.cos((location.latitude * Math.PI) / 180), 0.2);
  const longitudePadding = boundedRadius / (111_320 * longitudeScale);
  return {
    west: location.longitude - longitudePadding,
    south: location.latitude - latitudePadding,
    east: location.longitude + longitudePadding,
    north: location.latitude + latitudePadding,
  };
}
