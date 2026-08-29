import type * as GeoJSON from "geojson";

export type LandingMetric = {
  label: string;
  value: string;
  description: string;
};

export type LandingProblemTag = {
  title: string;
  layer: string;
  description: string;
};

export type LandingStoryCard = {
  title: string;
  description: string;
};

export type LandingFeatureId =
  | "smart-search"
  | "pedestrian-routing"
  | "service-area"
  | "fair-discovery";

export type LandingFeature = {
  id: LandingFeatureId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  chips: string[];
};

export type LandingMapPoint = {
  id: string;
  label: string;
  kind: "transit" | "umkm" | "hidden-gem" | "sponsored";
  coordinates: [number, number];
};

export type LandingMapFixture = {
  center: [number, number];
  route: GeoJSON.Feature<GeoJSON.LineString>;
  corridor: GeoJSON.Feature<GeoJSON.LineString>;
  serviceArea: GeoJSON.Feature<GeoJSON.Polygon>;
  points: LandingMapPoint[];
};

export type LandingTechnologyItem = {
  name: string;
  role: string;
};
