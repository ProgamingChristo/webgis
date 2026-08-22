import {
  SPATIAL_ENGINE_SOURCE,
  WGS84_SRID,
} from "@/src/modules/spatial/spatial.constants";
import { SpatialError } from "@/src/modules/spatial/spatial.errors";
import type {
  BBoxDTO,
  DistanceDTO,
  NearbyDTO,
  SpatialFeatureDTO,
  SpatialRepositoryRecord,
} from "@/src/modules/spatial/spatial.dto";
import type {
  BBoxQuery,
  NearbyQuery,
  SpatialLimitationFlag,
} from "@/src/modules/spatial/spatial.types";

function mapLabel(value: SpatialRepositoryRecord): string {
  switch (value.entity_type) {
    case "study_area":
    case "transport_corridor":
    case "transport_node":
      return value.record.name;
    case "umkm_profile":
      return value.record.business_name;
  }
}

export function mapSpatialRecordToDTO(
  value: SpatialRepositoryRecord,
): SpatialFeatureDTO {
  return {
    entity_type: value.entity_type,
    geometry: value.record.geometry,
    id: value.record.id,
    label: mapLabel(value),
    provenance: {
      data_version: value.record.provenance.data_version,
      retrieved_at: value.record.provenance.retrieved_at,
      source_id: value.record.provenance.source_id,
      source_record_id: value.record.provenance.source_record_id,
      source_type: value.record.provenance.source_type,
    },
  };
}

export function mapPostgisDistanceToDTO(distance: unknown): DistanceDTO {
  if (
    typeof distance !== "number" ||
    !Number.isFinite(distance) ||
    distance < 0
  ) {
    throw new SpatialError("SPATIAL_QUERY_FAILED");
  }

  return {
    analysis_method: "postgis_geography_distance",
    distance_meters: distance,
    limitation_flags: [],
    source: SPATIAL_ENGINE_SOURCE,
    srid: WGS84_SRID,
  };
}

export function mapNearbyRecordsToDTO(
  query: NearbyQuery,
  records: SpatialRepositoryRecord[],
  limitationFlags: SpatialLimitationFlag[],
): NearbyDTO {
  const safeRecords = records.map(mapSpatialRecordToDTO);
  return {
    analysis_method: "postgis_dwithin",
    limitation_flags: [...limitationFlags],
    origin: query.origin,
    radius_meters: query.radius_meters,
    records: safeRecords,
    returned_count: safeRecords.length,
    source: SPATIAL_ENGINE_SOURCE,
    srid: WGS84_SRID,
  };
}

export function mapBBoxRecordsToDTO(
  query: BBoxQuery,
  records: SpatialRepositoryRecord[],
  limitationFlags: SpatialLimitationFlag[],
): BBoxDTO {
  const safeRecords = records.map(mapSpatialRecordToDTO);
  return {
    analysis_method: "postgis_bbox_intersection",
    bbox: query.bbox,
    limitation_flags: [...limitationFlags],
    records: safeRecords,
    returned_count: safeRecords.length,
    source: SPATIAL_ENGINE_SOURCE,
    srid: WGS84_SRID,
  };
}

