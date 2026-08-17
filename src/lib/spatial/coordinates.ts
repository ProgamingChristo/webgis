import { coordinateSchema } from "@/src/modules/spatial/spatial.schema";
import { WGS84_SRID } from "@/src/modules/spatial/spatial.constants";
import type { Coordinate, PointGeometry } from "@/src/modules/spatial/spatial.types";
import type { Wgs84Position } from "@/src/types/spatial";

export function coordinateToPosition(coordinate: Coordinate): Wgs84Position {
  const parsed = coordinateSchema.parse(coordinate);
  return [parsed.longitude, parsed.latitude];
}

export function positionToCoordinate(position: Wgs84Position): Coordinate {
  return coordinateSchema.parse({
    latitude: position[1],
    longitude: position[0],
  });
}

export function coordinateToPointGeometry(coordinate: Coordinate): PointGeometry {
  return { coordinates: coordinateToPosition(coordinate), type: "Point" };
}

export function coordinateToEwktPoint(coordinate: Coordinate): string {
  const [longitude, latitude] = coordinateToPosition(coordinate);
  return `SRID=${WGS84_SRID};POINT(${longitude} ${latitude})`;
}
