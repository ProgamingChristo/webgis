import { MAX_GEOJSON_POSITIONS, WGS84_SRID } from "@/src/modules/spatial/spatial.constants";
import type { GeoJsonGeometry } from "@/src/modules/spatial/spatial.types";
import { geoJsonGeometrySchema } from "@/src/schemas/spatial.schema";
import type { Wgs84Position } from "@/src/types/spatial";

export class GeoJsonPreparationError extends Error {
  constructor() {
    super("GeoJSON geometry cannot be prepared for PostGIS");
    this.name = "GeoJsonPreparationError";
  }
}

function positionToWkt(position: Wgs84Position): string {
  return `${position[0]} ${position[1]}`;
}

function positionsToWkt(positions: Wgs84Position[]): string {
  return positions.map(positionToWkt).join(",");
}

export function countGeoJsonPositions(geometry: GeoJsonGeometry): number {
  switch (geometry.type) {
    case "Point":
      return 1;
    case "LineString":
      return geometry.coordinates.length;
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.reduce((total, line) => total + line.length, 0);
    case "MultiPolygon":
      return geometry.coordinates.reduce(
        (polygonTotal, polygon) =>
          polygonTotal + polygon.reduce((ringTotal, ring) => ringTotal + ring.length, 0),
        0,
      );
  }
}

export function geometryTypeForPostgis(geometry: GeoJsonGeometry): string {
  return geometry.type.toUpperCase();
}

export function geoJsonGeometryToEwkt(input: unknown): string {
  const parsed = geoJsonGeometrySchema.safeParse(input);
  if (!parsed.success || countGeoJsonPositions(parsed.data) > MAX_GEOJSON_POSITIONS) {
    throw new GeoJsonPreparationError();
  }

  const geometry = parsed.data;
  let wkt: string;

  switch (geometry.type) {
    case "Point":
      wkt = `POINT(${positionToWkt(geometry.coordinates)})`;
      break;
    case "LineString":
      wkt = `LINESTRING(${positionsToWkt(geometry.coordinates)})`;
      break;
    case "MultiLineString":
      wkt = `MULTILINESTRING(${geometry.coordinates
        .map((line) => `(${positionsToWkt(line)})`)
        .join(",")})`;
      break;
    case "Polygon":
      wkt = `POLYGON(${geometry.coordinates
        .map((ring) => `(${positionsToWkt(ring)})`)
        .join(",")})`;
      break;
    case "MultiPolygon":
      wkt = `MULTIPOLYGON(${geometry.coordinates
        .map(
          (polygon) =>
            `(${polygon
              .map((ring) => `(${positionsToWkt(ring)})`)
              .join(",")})`,
        )
        .join(",")})`;
      break;
  }

  return `SRID=${WGS84_SRID};${wkt}`;
}

