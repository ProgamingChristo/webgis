import type { JsonObject } from "@/src/types/provenance";

export type ExternalSpatialRecord = {
  source_record_id: string;
  geometry: unknown;
  properties: unknown;
};

export type NormalizedSpatialRecord<TGeometry, TProperties> = {
  geometry: TGeometry;
  properties: TProperties;
  source_id: string;
  source_record_id: string;
  data_version: string;
  retrieved_at: string;
  validation_status: "PENDING";
  metadata: JsonObject;
};

export interface ExternalSpatialAdapter<TRecord extends ExternalSpatialRecord> {
  read(): AsyncIterable<TRecord>;
}

export interface SpatialRecordValidator<TInput, TValidated> {
  validate(input: TInput): TValidated;
}

export interface SpatialRecordNormalizer<TValidated, TNormalized> {
  normalize(input: TValidated): TNormalized;
}

export interface SpatialImportRepository<TRecord> {
  existsBySourceRecordId(
    sourceId: string,
    sourceRecordId: string,
  ): Promise<boolean>;
  saveBatch(records: readonly TRecord[]): Promise<void>;
}

// Phase 5 defines contracts only. A future importer must compose:
// adapter -> validation -> normalization -> repository. No external source writes directly.
