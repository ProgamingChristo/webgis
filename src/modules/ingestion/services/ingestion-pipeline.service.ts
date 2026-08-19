

import type { ImportJobRepository } from "../repositories/import-job.repository";
import type { DataSourceRepository } from "../repositories/data-source.repository";
import type { IngestionAdapter } from "../contracts/ingestion-adapter.interface";
import type { CreateImportJobInput, ImportJob, ImportJobMetrics } from "../ingestion.types";
import type { JsonObject } from "@/src/types/provenance";
import { RepositoryError } from "@/src/repositories/errors";

export class IngestionPipelineService {
  constructor(
    private importJobRepo: ImportJobRepository,
    private dataSourceRepo: DataSourceRepository,
  ) {}

  /**
   * Initializes a new import job tracking record.
   */
  async startJob(input: CreateImportJobInput): Promise<ImportJob> {
    const dataSource = await this.dataSourceRepo.findByCode(input.data_source_id);
    if (!dataSource) {
      throw new RepositoryError("VALIDATION_ERROR", "startJob", {
        cause: `Data source with code ${input.data_source_id} not found`,
      });
    }

    return await this.importJobRepo.create({
      ...input,
      data_source_id: dataSource.id,
    });
  }

  /**
   * Executes the ingestion pipeline for a given job and adapter.
   */
  async execute<TRaw>(job: ImportJob, adapter: IngestionAdapter<TRaw>): Promise<ImportJob> {
    // 1. Mark as running
    job = await this.importJobRepo.update(job.id, { 
      status: "RUNNING",
      started_at: new Date().toISOString(),
    });

    const metrics: ImportJobMetrics = {
      total_records: 0,
      processed_records: 0,
      failed_records: 0,
      inserted_records: 0,
      updated_records: 0, // In this pipeline we only count successful upserts as 'inserted' for simplicity or let adapter specify
    };
    
    const errorLog: Record<string, unknown> = {};

    try {
      // 2. Fetch records (Stream)
      for await (const rawRecord of adapter.fetchRecords(job)) {
        metrics.total_records++;
        try {
          // 3. Validate
          const validated = adapter.validateRaw(rawRecord);

          // 4. Normalize
          const normalized = await adapter.normalize(validated);
          
          if (!normalized) {
            // Skipped by adapter
            metrics.processed_records++;
            continue;
          }

          // 5. Upsert (Dry Run logic is handled by adapter ideally, or we skip calling it)
          if (!job.is_dry_run) {
            const success = await adapter.upsert(normalized);
            if (success) {
              metrics.inserted_records++;
            }
          }
          
          metrics.processed_records++;
        } catch (error) {
          metrics.failed_records++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errorLog[`record_${metrics.total_records}`] = errorMessage;
        }
      }

      // 6. Complete Job
      return await this.importJobRepo.update(job.id, {
        status: metrics.failed_records > 0 && metrics.processed_records > 0 ? "PARTIAL" : "COMPLETED",
        completed_at: new Date().toISOString(),
        metrics,
        error_log: Object.keys(errorLog).length > 0 ? (errorLog as unknown as JsonObject) : null,
      });

    } catch (criticalError) {
      // Complete Job with Failure
      return await this.importJobRepo.update(job.id, {
        status: "FAILED",
        completed_at: new Date().toISOString(),
        metrics,
        error_log: {
          critical: criticalError instanceof Error ? criticalError.message : String(criticalError),
          ...errorLog
        },
      });
    }
  }
}
