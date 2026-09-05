import type { SourceType } from "@/src/types/provenance";
import type {
  GeoJsonGeometry,
  LineStringGeometry,
  MultiLineStringGeometry,
  MultiPolygonGeometry,
  PointGeometry,
  PolygonGeometry,
} from "@/src/types/spatial";

import type {
  BBOX_ENTITY_TYPES,
  NEARBY_ENTITY_TYPES,
  SPATIAL_ENGINE_SOURCE,
  WGS84_REFERENCE,
  WGS84_SRID,
} from "@/src/modules/spatial/spatial.constants";

export type {
  GeoJsonGeometry,
  LineStringGeometry,
  MultiLineStringGeometry,
  MultiPolygonGeometry,
  PointGeometry,
  PolygonGeometry,
};

export interface Coordinate {
  longitude: number;
  latitude: number;
}

/** API convention. Repository RPC parameters are mapped to min/max names. */
export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type LineGeometry = LineStringGeometry | MultiLineStringGeometry;

export interface SpatialReference {
  name: typeof WGS84_REFERENCE;
  srid: typeof WGS84_SRID;
}

export type NearbyEntityType = (typeof NEARBY_ENTITY_TYPES)[number];
export type BBoxEntityType = (typeof BBOX_ENTITY_TYPES)[number];
export type SpatialEntityType = BBoxEntityType;

export type SpatialLimitationFlag =
  | "NETWORK_GRAPH_UNAVAILABLE"
  | "ESTIMATED_WALKING_TIME"
  | "FIXTURE_DATA"
  | "NO_PRODUCTION_DATA";

export interface SpatialProvenance {
  data_version: string;
  retrieved_at: string;
  source_id: string | null;
  source_record_id: string | null;
  source_type: SourceType | null;
}

export interface SpatialFeature {
  entity_type: SpatialEntityType;
  geometry: GeoJsonGeometry;
  id: string;
  label: string;
  provenance: SpatialProvenance;
}

export interface DistanceRequest {
  origin: Coordinate;
  destination: Coordinate;
}

export interface DistanceResult {
  analysis_method: "postgis_geography_distance";
  distance_meters: number;
  limitation_flags: SpatialLimitationFlag[];
  source: typeof SPATIAL_ENGINE_SOURCE;
  srid: typeof WGS84_SRID;
}

export interface NearbyQuery {
  entity_type: NearbyEntityType;
  limit: number;
  origin: Coordinate;
  radius_meters: number;
}

export interface NearbyResult {
  analysis_method: "postgis_dwithin";
  limitation_flags: SpatialLimitationFlag[];
  origin: Coordinate;
  radius_meters: number;
  records: SpatialFeature[];
  returned_count: number;
  source: typeof SPATIAL_ENGINE_SOURCE;
  srid: typeof WGS84_SRID;
}

export interface BBoxQuery {
  bbox: BoundingBox;
  entity_type: BBoxEntityType;
  limit: number;
}

export interface BBoxResult {
  analysis_method: "postgis_bbox_intersection";
  bbox: BoundingBox;
  limitation_flags: SpatialLimitationFlag[];
  records: SpatialFeature[];
  returned_count: number;
  source: typeof SPATIAL_ENGINE_SOURCE;
  srid: typeof WGS84_SRID;
}

export interface WalkingTimeResult {
  analysis_method: "estimated_from_distance";
  distance_meters: number;
  estimated_seconds: number;
  limitation_flags: ["ESTIMATED_WALKING_TIME"];
  source: typeof SPATIAL_ENGINE_SOURCE;
  walking_speed_mps: number;
}

export interface ServiceAreaRequest {
  max_walking_minutes: number;
  mode: "walking";
  origin: Coordinate;
}

export interface ServiceAreaResult {
  analysis_method: "network_service_area";
  geometry: MultiPolygonGeometry;
  limitation_flags: SpatialLimitationFlag[];
  source: typeof SPATIAL_ENGINE_SOURCE;
}

export interface RoutingConstraints {
  avoid?: string[];
}

export interface RoutingRequest {
  constraints?: RoutingConstraints;
  destination: Coordinate;
  destination_merchant_id?: string;
  include_alternatives?: boolean;
  mode: "walking" | "motorcycle" | "car";
  origin: Coordinate;
  route_preference?: "FASTEST" | "UMKM";
}

export interface RoutingResult {
  analysis_method: "pgrouting_network_route";
  distance_meters: number;
  duration_seconds: number;
  geometry: LineStringGeometry;
  limitation_flags: SpatialLimitationFlag[];
  route_source: string;
  source: typeof SPATIAL_ENGINE_SOURCE;
}
