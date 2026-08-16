export type Wgs84Position = [longitude: number, latitude: number];

export interface PointGeometry {
  type: "Point";
  coordinates: Wgs84Position;
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: Wgs84Position[];
}

export interface MultiLineStringGeometry {
  type: "MultiLineString";
  coordinates: Wgs84Position[][];
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Wgs84Position[][][];
}

export type CorridorGeometry = LineStringGeometry | MultiLineStringGeometry;

export type GeoJsonGeometry =
  | PointGeometry
  | LineStringGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry;

/** Raw database geometry is intentionally opaque until a mapper validates it. */
export type DatabaseGeometry = unknown;

export interface BoundingBox {
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
}

export interface NearPoint {
  longitude: number;
  latitude: number;
  radius_meters: number;
}
