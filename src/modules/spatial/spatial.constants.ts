export const WGS84_SRID = 4326 as const;
export const WGS84_REFERENCE = "EPSG:4326" as const;
export const SPATIAL_ENGINE_SOURCE = "GETRA_SPATIAL_ENGINE" as const;

/** Operational safety cap, not a product/business search radius. */
export const DEFAULT_SPATIAL_MAX_RADIUS_METERS = 50_000;
export const MAX_CONFIGURABLE_RADIUS_METERS = 100_000;
/** Operational query extent caps, not study-area or product boundaries. */
export const DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES = 10;
export const DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES = 10;
export const DEFAULT_SPATIAL_RESULT_LIMIT = 20;
export const MAX_SPATIAL_RESULT_LIMIT = 100;
export const DEFAULT_WALKING_SPEED_METERS_PER_SECOND = 1.4;
export const MAX_SPATIAL_JSON_BODY_BYTES = 4_096;
export const MAX_GEOJSON_POSITIONS = 10_000;

export const NEARBY_ENTITY_TYPES = [
  "transport_node",
  "umkm_profile",
] as const;

export const BBOX_ENTITY_TYPES = [
  "study_area",
  "transport_corridor",
  "transport_node",
  "umkm_profile",
] as const;
