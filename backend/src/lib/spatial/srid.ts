import {
  WGS84_REFERENCE,
  WGS84_SRID,
} from "@/src/modules/spatial/spatial.constants";
import type { SpatialReference } from "@/src/modules/spatial/spatial.types";

export const GETRA_SPATIAL_REFERENCE: SpatialReference = Object.freeze({
  name: WGS84_REFERENCE,
  srid: WGS84_SRID,
});

