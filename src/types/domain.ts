import type {
  BaseEntity,
  RepositoryPagination,
  RepositorySort,
} from "@/src/types/entity";
import type {
  CreateProvenanceInput,
  JsonObject,
  Provenance,
  ProvenanceDatabaseColumns,
  SourceType,
  UpdateProvenanceInput,
  ValidationStatus,
} from "@/src/types/provenance";
import type {
  CorridorGeometry,
  DatabaseGeometry,
  MultiLineStringGeometry,
  MultiPolygonGeometry,
  PointGeometry,
} from "@/src/types/spatial";

export const SPATIAL_SOURCE_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "source_name",
] as const;
export const STUDY_AREA_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "name",
] as const;
export const TRANSPORT_CORRIDOR_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "name",
] as const;
export const TRANSPORT_NODE_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "name",
] as const;
export const UMKM_PROFILE_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "business_name",
] as const;

export type SpatialSourceSortField =
  (typeof SPATIAL_SOURCE_SORT_FIELDS)[number];
export type StudyAreaSortField = (typeof STUDY_AREA_SORT_FIELDS)[number];
export type TransportCorridorSortField =
  (typeof TRANSPORT_CORRIDOR_SORT_FIELDS)[number];
export type TransportNodeSortField =
  (typeof TRANSPORT_NODE_SORT_FIELDS)[number];
export type UmkmProfileSortField =
  (typeof UMKM_PROFILE_SORT_FIELDS)[number];

export interface SpatialSourceDatabaseRow extends BaseEntity {
  source_name: string;
  source_type: SourceType;
  description: string | null;
  metadata: unknown;
}

export interface SpatialSourceEntity extends BaseEntity {
  source_name: string;
  source_type: SourceType;
  description: string | null;
  metadata: JsonObject;
}

export interface SpatialSourceDTO extends BaseEntity {
  source_name: string;
  source_type: SourceType;
  description: string | null;
  metadata: JsonObject;
}

export interface CreateSpatialSourceInput {
  source_name: string;
  source_type: SourceType;
  description?: string | null;
  metadata?: JsonObject;
}

/** `source_type` is source identity and is intentionally immutable. */
export interface UpdateSpatialSourceInput {
  source_name?: string;
  description?: string | null;
  metadata?: JsonObject;
}

export interface SpatialSourceFilter {
  source_type?: SourceType;
}

export type SpatialSourceListQuery = SpatialSourceFilter &
  RepositoryPagination &
  RepositorySort<SpatialSourceSortField>;

export interface StudyAreaDatabaseRow
  extends BaseEntity,
    ProvenanceDatabaseColumns {
  name: string;
  description: string | null;
  geometry: DatabaseGeometry;
}

export interface StudyAreaEntity extends BaseEntity {
  name: string;
  description: string | null;
  geometry: MultiPolygonGeometry;
  provenance: Provenance;
}

export interface StudyAreaDTO extends BaseEntity {
  name: string;
  description: string | null;
  geometry: MultiPolygonGeometry;
  provenance: Provenance;
}

export interface CreateStudyAreaInput {
  name: string;
  description?: string | null;
  geometry: MultiPolygonGeometry;
  provenance: CreateProvenanceInput;
}

export interface UpdateStudyAreaInput {
  name?: string;
  description?: string | null;
  geometry?: MultiPolygonGeometry;
  provenance?: UpdateProvenanceInput;
}

export interface StudyAreaFilter {
  source_id?: string;
  validation_status?: ValidationStatus;
}

export type StudyAreaListQuery = StudyAreaFilter &
  RepositoryPagination &
  RepositorySort<StudyAreaSortField>;

export interface TransportCorridorDatabaseRow
  extends BaseEntity,
    ProvenanceDatabaseColumns {
  name: string;
  transport_mode: string;
  description: string | null;
  geometry: DatabaseGeometry;
}

export interface TransportCorridorEntity extends BaseEntity {
  name: string;
  transport_mode: string;
  description: string | null;
  geometry: MultiLineStringGeometry;
  provenance: Provenance;
}

export interface TransportCorridorDTO extends BaseEntity {
  name: string;
  transport_mode: string;
  description: string | null;
  geometry: MultiLineStringGeometry;
  provenance: Provenance;
}

export interface CreateTransportCorridorInput {
  name: string;
  transport_mode: string;
  description?: string | null;
  geometry: CorridorGeometry;
  provenance: CreateProvenanceInput;
}

export interface UpdateTransportCorridorInput {
  name?: string;
  transport_mode?: string;
  description?: string | null;
  geometry?: CorridorGeometry;
  provenance?: UpdateProvenanceInput;
}

export interface TransportCorridorFilter {
  source_id?: string;
  transport_mode?: string;
  validation_status?: ValidationStatus;
}

export type TransportCorridorListQuery = TransportCorridorFilter &
  RepositoryPagination &
  RepositorySort<TransportCorridorSortField>;

export interface TransportNodeDatabaseRow
  extends BaseEntity,
    ProvenanceDatabaseColumns {
  corridor_id: string | null;
  name: string;
  node_type: string;
  transport_mode: string;
  geometry: DatabaseGeometry;
}

export interface TransportNodeEntity extends BaseEntity {
  corridor_id: string | null;
  name: string;
  node_type: string;
  transport_mode: string;
  geometry: PointGeometry;
  provenance: Provenance;
}

export interface TransportNodeDTO extends BaseEntity {
  corridor_id: string | null;
  name: string;
  node_type: string;
  transport_mode: string;
  geometry: PointGeometry;
  provenance: Provenance;
}

export interface CreateTransportNodeInput {
  corridor_id?: string | null;
  name: string;
  node_type: string;
  transport_mode: string;
  geometry: PointGeometry;
  provenance: CreateProvenanceInput;
}

export interface UpdateTransportNodeInput {
  corridor_id?: string | null;
  name?: string;
  node_type?: string;
  transport_mode?: string;
  geometry?: PointGeometry;
  provenance?: UpdateProvenanceInput;
}

export interface TransportNodeFilter {
  source_id?: string;
  corridor_id?: string;
  transport_mode?: string;
  node_type?: string;
  validation_status?: ValidationStatus;
}

export type TransportNodeListQuery = TransportNodeFilter &
  RepositoryPagination &
  RepositorySort<TransportNodeSortField>;

export interface UmkmProfileDatabaseRow
  extends BaseEntity,
    ProvenanceDatabaseColumns {
  owner_id: string;
  business_name: string;
  category: string;
  description: string | null;
  address: string | null;
  geometry: DatabaseGeometry;
}

export interface UmkmProfileEntity extends BaseEntity {
  owner_id: string;
  business_name: string;
  category: string;
  description: string | null;
  address: string | null;
  geometry: PointGeometry;
  provenance: Provenance;
}

/** Owner identity is deliberately omitted from the public DTO. */
export interface UmkmProfileDTO extends BaseEntity {
  business_name: string;
  category: string;
  description: string | null;
  address: string | null;
  geometry: PointGeometry;
  provenance: Provenance;
}

/** `owner_id` is supplied by authenticated service context, never client input. */
export interface CreateUmkmProfileInput {
  business_name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  geometry: PointGeometry;
}

export interface UpdateUmkmProfileInput {
  business_name?: string;
  category?: string;
  description?: string | null;
  address?: string | null;
  geometry?: PointGeometry;
}

export interface UmkmProfileFilter {
  owner_id?: string;
  source_id?: string;
  category?: string;
  validation_status?: ValidationStatus;
}

export type UmkmProfileListQuery = UmkmProfileFilter &
  RepositoryPagination &
  RepositorySort<UmkmProfileSortField>;
