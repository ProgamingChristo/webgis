import type { LineStringGeometry } from "@/src/types/spatial";

export function isRouteGeometry(value: unknown): value is LineStringGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<LineStringGeometry>;
  return geometry.type === "LineString" && Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 1 && geometry.coordinates.every((point) =>
      Array.isArray(point) && point.length === 2 &&
      Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
      Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90,
    );
}
