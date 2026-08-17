import {
  geoJsonGeometryToEwkt,
  geometryTypeForPostgis,
} from "@/src/lib/spatial/geojson";
import type { GeoJsonGeometry } from "@/src/modules/spatial/spatial.types";
import { geoJsonGeometrySchema } from "@/src/schemas/spatial.schema";

export interface PreparedWgs84Geometry {
  allowed_types: string[];
  ewkt: string;
  geometry: GeoJsonGeometry;
}

export function prepareWgs84Geometry(input: unknown): PreparedWgs84Geometry {
  const geometry = geoJsonGeometrySchema.parse(input);
  return {
    allowed_types: [geometryTypeForPostgis(geometry)],
    ewkt: geoJsonGeometryToEwkt(geometry),
    geometry,
  };
}

