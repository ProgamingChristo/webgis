import type { ImportJob } from "../ingestion.types";

export interface IngestionAdapter<TRawRecord> {
  /**
   * Identifies this adapter instance (e.g., "MAPID", "SURVEY_FIXTURE").
   * Must match the code of a registered data_source.
   */
  readonly sourceCode: string;

  /**
   * Validates the raw record structure before it is normalized.
   * Throws an error if validation fails.
   */
  validateRaw(record: unknown): TRawRecord;

  /**
   * Normalizes a validated raw record into a standard domain input format.
   * Return null if the record should be skipped (e.g., filtered out).
   */
  normalize(record: TRawRecord): Promise<unknown | null>;

  /**
   * Provide records to the pipeline.
   * Can be implemented as a generator for streaming large files/apis.
   */
  fetchRecords(job: ImportJob): AsyncGenerator<unknown, void, unknown>;

  /**
   * Persists the normalized record to the actual database domain tables.
   * Must handle deduplication using source_id and source_record_id.
   * Returns true if inserted/updated, false if skipped.
   */
  upsert(normalizedRecord: unknown): Promise<boolean>;
}
