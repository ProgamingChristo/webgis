import {
  metadataSchema,
  provenanceSchema,
  sourceTypeSchema,
} from "@/src/schemas/data-model.schema";
import {
  mapDatabaseMultiLineStringGeometry,
  mapDatabaseMultiPolygonGeometry,
  mapDatabasePointGeometry,
} from "@/src/mappers/geometry.mapper";
import type {
  SpatialSourceDatabaseRow,
  SpatialSourceDTO,
  SpatialSourceEntity,
  StudyAreaDatabaseRow,
  StudyAreaDTO,
  StudyAreaEntity,
  TransportCorridorDatabaseRow,
  TransportCorridorDTO,
  TransportCorridorEntity,
  TransportNodeDatabaseRow,
  TransportNodeDTO,
  TransportNodeEntity,
  TransportRouteStopDatabaseRow,
  TransportRouteStopDTO,
  TransportRouteStopEntity,
  UmkmProfileDatabaseRow,
  UmkmProfileDTO,
  UmkmProfileEntity,
} from "@/src/types/domain";
import type {
  Provenance,
  ProvenanceDatabaseColumns,
} from "@/src/types/provenance";

export function mapProvenance(
  row: ProvenanceDatabaseColumns,
): Provenance {
  return provenanceSchema.parse({
    source_id: row.source_id,
    source_type: row.source
      ? sourceTypeSchema.parse(row.source.source_type)
      : null,
    source_record_id: row.source_record_id,
    data_version: row.data_version,
    retrieved_at: row.retrieved_at,
    validated_at: row.validated_at,
    validation_status: row.validation_status,
    metadata: row.metadata,
  });
}

export function mapSpatialSourceRowToEntity(
  row: SpatialSourceDatabaseRow,
): SpatialSourceEntity {
  return {
    id: row.id,
    source_name: row.source_name,
    source_type: sourceTypeSchema.parse(row.source_type),
    description: row.description,
    metadata: metadataSchema.parse(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapSpatialSourceEntityToDTO(
  entity: SpatialSourceEntity,
): SpatialSourceDTO {
  return {
    id: entity.id,
    source_name: entity.source_name,
    source_type: entity.source_type,
    description: entity.description,
    metadata: metadataSchema.parse(entity.metadata),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function mapSpatialSourceRowToDTO(
  row: SpatialSourceDatabaseRow,
): SpatialSourceDTO {
  return mapSpatialSourceEntityToDTO(mapSpatialSourceRowToEntity(row));
}

export function mapStudyAreaRowToEntity(
  row: StudyAreaDatabaseRow,
): StudyAreaEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    geometry: mapDatabaseMultiPolygonGeometry(row.geometry),
    provenance: mapProvenance(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapStudyAreaEntityToDTO(
  entity: StudyAreaEntity,
): StudyAreaDTO {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    geometry: mapDatabaseMultiPolygonGeometry(entity.geometry),
    provenance: provenanceSchema.parse(entity.provenance),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function mapStudyAreaRowToDTO(
  row: StudyAreaDatabaseRow,
): StudyAreaDTO {
  return mapStudyAreaEntityToDTO(mapStudyAreaRowToEntity(row));
}

export function mapTransportCorridorRowToEntity(
  row: TransportCorridorDatabaseRow,
): TransportCorridorEntity {
  return {
    id: row.id,
    name: row.name,
    transport_mode: row.transport_mode,
    description: row.description,
    geometry: mapDatabaseMultiLineStringGeometry(row.geometry),
    provenance: mapProvenance(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapTransportCorridorEntityToDTO(
  entity: TransportCorridorEntity,
): TransportCorridorDTO {
  return {
    id: entity.id,
    name: entity.name,
    transport_mode: entity.transport_mode,
    description: entity.description,
    geometry: mapDatabaseMultiLineStringGeometry(entity.geometry),
    provenance: provenanceSchema.parse(entity.provenance),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function mapTransportCorridorRowToDTO(
  row: TransportCorridorDatabaseRow,
): TransportCorridorDTO {
  return mapTransportCorridorEntityToDTO(
    mapTransportCorridorRowToEntity(row),
  );
}

export function mapTransportNodeRowToEntity(
  row: TransportNodeDatabaseRow,
): TransportNodeEntity {
  return {
    id: row.id,
    corridor_id: row.corridor_id,
    name: row.name,
    node_type: row.node_type,
    transport_mode: row.transport_mode,
    geometry: mapDatabasePointGeometry(row.geometry),
    provenance: mapProvenance(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapTransportNodeEntityToDTO(
  entity: TransportNodeEntity,
): TransportNodeDTO {
  return {
    id: entity.id,
    corridor_id: entity.corridor_id,
    name: entity.name,
    node_type: entity.node_type,
    transport_mode: entity.transport_mode,
    geometry: mapDatabasePointGeometry(entity.geometry),
    provenance: provenanceSchema.parse(entity.provenance),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function mapTransportNodeRowToDTO(
  row: TransportNodeDatabaseRow,
): TransportNodeDTO {
  return mapTransportNodeEntityToDTO(mapTransportNodeRowToEntity(row));
}

export function mapTransportRouteStopRowToEntity(
  row: TransportRouteStopDatabaseRow,
): TransportRouteStopEntity {
  return {
    id: row.id,
    corridor_id: row.corridor_id,
    node_id: row.node_id,
    stop_sequence: row.stop_sequence,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapTransportRouteStopEntityToDTO(
  entity: TransportRouteStopEntity,
): TransportRouteStopDTO {
  return {
    id: entity.id,
    corridor_id: entity.corridor_id,
    node_id: entity.node_id,
    stop_sequence: entity.stop_sequence,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function mapTransportRouteStopRowToDTO(
  row: TransportRouteStopDatabaseRow,
): TransportRouteStopDTO {
  return mapTransportRouteStopEntityToDTO(mapTransportRouteStopRowToEntity(row));
}

export function mapUmkmProfileRowToEntity(
  row: UmkmProfileDatabaseRow,
): UmkmProfileEntity {
  return {
    id: row.id,
    owner_id: row.owner_id,
    business_name: row.business_name,
    category: row.category,
    description: row.description,
    address: row.address,
    geometry: mapDatabasePointGeometry(row.geometry),
    provenance: mapProvenance(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapUmkmProfileEntityToDTO(
  entity: UmkmProfileEntity,
): UmkmProfileDTO {
  return {
    id: entity.id,
    business_name: entity.business_name,
    category: entity.category,
    description: entity.description,
    address: entity.address,
    geometry: mapDatabasePointGeometry(entity.geometry),
    provenance: provenanceSchema.parse(entity.provenance),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

export function mapUmkmProfileRowToDTO(
  row: UmkmProfileDatabaseRow,
): UmkmProfileDTO {
  return mapUmkmProfileEntityToDTO(mapUmkmProfileRowToEntity(row));
}
