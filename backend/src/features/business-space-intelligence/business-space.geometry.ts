import { multiPolygonGeometrySchema, polygonGeometrySchema } from "@/src/schemas/spatial.schema";

type Position = [number, number];

/** City envelopes overlap; only the actual boundary can establish membership. */
export function regionContainsPoint(geometry: unknown, point: { longitude: number; latitude: number }): boolean {
  const parsed = polygonGeometrySchema.or(multiPolygonGeometrySchema).safeParse(geometry);
  if (!parsed.success) return false;
  const polygons = parsed.data.type === "Polygon" ? [parsed.data.coordinates] : parsed.data.coordinates;
  const position: Position = [point.longitude, point.latitude];
  return polygons.some((rings) => {
    const outer = ringPosition(rings[0], position);
    if (outer === "OUTSIDE") return false;
    if (outer === "BOUNDARY") return true;
    return !rings.slice(1).some((ring) => ringPosition(ring, position) === "INSIDE");
  });
}

function ringPosition(ring: Position[], [longitude, latitude]: Position): "INSIDE" | "OUTSIDE" | "BOUNDARY" {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x1, y1] = ring[previous];
    const [x2, y2] = ring[index];
    const cross = (longitude - x1) * (y2 - y1) - (latitude - y1) * (x2 - x1);
    if (Math.abs(cross) < 1e-12 && longitude >= Math.min(x1, x2) && longitude <= Math.max(x1, x2)
      && latitude >= Math.min(y1, y2) && latitude <= Math.max(y1, y2)) return "BOUNDARY";
    if ((y1 > latitude) !== (y2 > latitude)
      && longitude < ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside ? "INSIDE" : "OUTSIDE";
}
