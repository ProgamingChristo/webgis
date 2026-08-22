export const SOURCE_TYPES = [
  "external",
  "survey",
  "manual",
  "imported",
  "system",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const VALIDATION_STATUSES = [
  "PENDING",
  "VALIDATED",
  "REJECTED",
  "ARCHIVED",
] as const;

export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

/** Flat columns persisted on a spatial entity row. */
export interface ProvenanceDatabaseColumns {
  source_id: string | null;
  source_record_id: string | null;
  data_version: string;
  retrieved_at: string;
  validated_at: string | null;
  validation_status: ValidationStatus;
  metadata: unknown;
  source: ProvenanceSourceDatabaseRow | null;
}

export interface ProvenanceSourceDatabaseRow {
  source_type: SourceType;
}

/** API-safe provenance composed with source metadata by a mapper. */
export interface Provenance {
  source_id: string | null;
  source_type: SourceType | null;
  source_record_id: string | null;
  data_version: string;
  retrieved_at: string;
  validated_at: string | null;
  validation_status: ValidationStatus;
  metadata: JsonObject;
}

export interface CreateProvenanceInput {
  source_id?: string | null;
  source_record_id?: string | null;
  data_version?: string;
  retrieved_at?: string;
  validated_at?: string | null;
  validation_status?: ValidationStatus;
  metadata?: JsonObject;
}

/** Source identity is intentionally absent and cannot be changed by updates. */
export interface UpdateProvenanceInput {
  data_version?: string;
  retrieved_at?: string;
  validated_at?: string | null;
  validation_status?: ValidationStatus;
  metadata?: JsonObject;
}
