import type { BusinessSpaceViewport } from "../types/business-space.types";

// The existing candidates API accepts at most one degree on either axis.
export function isPropertyViewportTooWide(viewport: BusinessSpaceViewport): boolean {
  return viewport.east - viewport.west > 1 || viewport.north - viewport.south > 1;
}

export function normalizePropertyViewport(viewport: BusinessSpaceViewport): BusinessSpaceViewport | null {
  if (!Object.values(viewport).every(Number.isFinite)) return null;
  const normalized = {
    west: Math.max(-180, Math.min(180, viewport.west)),
    south: Math.max(-90, Math.min(90, viewport.south)),
    east: Math.max(-180, Math.min(180, viewport.east)),
    north: Math.max(-90, Math.min(90, viewport.north)),
  };
  if (normalized.west >= normalized.east || normalized.south >= normalized.north) return null;
  return normalized;
}

export function propertyViewportKey(viewport: BusinessSpaceViewport | null): string {
  if (!viewport) return "";
  return [viewport.west, viewport.south, viewport.east, viewport.north].join(",");
}
