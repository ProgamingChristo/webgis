export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type Wgs84Position =
  [longitude: number, latitude: number];

export interface LineStringGeometry {
  type: "LineString";
  coordinates: Wgs84Position[];
}

export interface PointGeometry {
  type: "Point";
  coordinates: Wgs84Position;
}
