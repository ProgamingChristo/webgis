export interface RegionBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface AdministrativeBoundaryProperties {
  id: string;
  name: string;
  region_type: "CITY";
  bounds: RegionBounds;
}

export interface AdministrativeBoundaryFeature {
  type: "Feature";
  id: string;
  properties: AdministrativeBoundaryProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown[];
  };
}

export interface AdministrativeBoundaryCollection {
  type: "FeatureCollection";
  features: AdministrativeBoundaryFeature[];
}
