import type * as GeoJSON from "geojson";

import type { MapViewportBounds, SearchRegion } from "@/src/services/mapid-layer.service";

export interface AdministrativeBoundaryProperties {
  id: string;
  name: string;
  region_type: "CITY";
  bounds: MapViewportBounds;
}

export type AdministrativeBoundaryFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  AdministrativeBoundaryProperties
>;

export type AdministrativeBoundaryCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  AdministrativeBoundaryProperties
>;

export interface RegionMerchantLike {
  id: string;
  regionIds?: string[];
  regions?: string[];
  city?: string;
}

export interface RegionResultGroup<T extends RegionMerchantLike> {
  id: string;
  name: string;
  merchants: T[];
}

export type RegionCatalogItem = Pick<SearchRegion, "id" | "name">;
