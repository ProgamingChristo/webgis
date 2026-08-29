export const DATA_READINESS_MODEL_VERSION = "GETRA_DATA_READINESS_V1" as const;
export const VISIBILITY_MODEL_VERSION = "GETRA_VISIBILITY_READINESS_V1" as const;
export const LOCATION_READINESS_MODEL_VERSION = "GETRA_LOCATION_READINESS_V1" as const;
export const RECOMMENDATION_MODEL_VERSION = "GETRA_UMKM_RECOMMENDATIONS_V1" as const;

export const DATA_READINESS_WEIGHTS = {
  NAME: 15,
  CATEGORY: 15,
  LOCATION: 20,
  ADDRESS: 10,
  OPENING_HOURS: 10,
  PRICE: 10,
  PHOTO: 5,
  MENU: 5,
  PHONE: 5,
  VERIFIED_STATUS: 5,
} as const;

export const VISIBILITY_WEIGHTS = {
  PUBLISHED: 20,
  CATEGORY: 20,
  LOCATION: 15,
  OPENING_HOURS: 15,
  PRICE: 15,
  NETWORK_REACHABILITY: 15,
} as const;

export const LOCATION_WEIGHTS = {
  VALID_GEOMETRY: 30,
  ADMINISTRATIVE_REGION: 25,
  PEDESTRIAN_REACHABILITY: 25,
  TRANSIT_NETWORK_EVIDENCE: 20,
} as const;

export const UMKM_INTELLIGENCE_LIMITATIONS = [
  "Data Readiness measures profile evidence completeness, not business quality.",
  "Visibility Readiness measures GETRA discovery eligibility, not popularity or sales.",
  "Location Readiness is spatial evidence, not property or investment value.",
  "Demand and Retail Gap are observed GETRA signals, not total population demand or financial forecasts.",
  "Nearby similar merchants are represented canonical supply, not confirmed direct competitors.",
] as const;

export const MAX_SIMILAR_MERCHANTS = 20;
export const TRANSIT_SEARCH_RADIUS_METERS = 2_000;
export const SOURCE_FRESHNESS_DAYS = 180;
