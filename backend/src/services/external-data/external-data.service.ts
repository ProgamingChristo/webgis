import "server-only";

import type {
  ExternalDataProvider,
  ExternalIntegrationMetrics,
} from "@/src/integrations/core";
import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import { mapMapidRecordToExternalEntityInput } from "@/src/integrations/mapid/mapid.mapper";
import { mapidRequestContextSchema } from "@/src/integrations/mapid/mapid.schema";
import {
  MAPID_PROVIDER,
  type MapidInvalidRecord,
  type MapidNormalizedBatch,
  type MapidNormalizedRecord,
  type MapidRequest,
  type MapidRequestContext,
  type MapidValidatedBatch,
} from "@/src/integrations/mapid/mapid.types";
import { logger as defaultLogger, type Logger } from "@/src/lib/logger";
import { RepositoryError } from "@/src/repositories/errors";
import type { ExternalRecordRepositoryContract } from "@/src/repositories/external-record.repository";
import type { ExternalEntityWrite } from "@/src/types/integrations/external-record";

type MapidProviderAdapter = ExternalDataProvider<
  MapidRequest,
  MapidRequestContext,
  MapidValidatedBatch,
  MapidNormalizedBatch
>;

type ExternalRecordPort = Pick<
  ExternalRecordRepositoryContract,
  "createNormalizedRecord" | "existsBySourceRecordId"
>;

export interface ExternalDataProcessInput {
  context: MapidRequestContext;
  dryRun: boolean;
  provider: typeof MAPID_PROVIDER;
  query: MapidRequest;
}

export interface ExternalDuplicateRecord {
  detected_by: "batch" | "constraint" | "repository";
  entity_kind: "transport_node";
  source_record_id: string;
}

export interface ExternalDataProcessResult {
  dry_run: boolean;
  duplicate_records: ExternalDuplicateRecord[];
  invalid_records: MapidInvalidRecord[];
  metrics: ExternalIntegrationMetrics;
  new_records: number;
  normalized_records: MapidNormalizedRecord[];
  parsed_records: number;
  persisted_records: number;
  provider: typeof MAPID_PROVIDER;
  status: "ok" | "partial";
}

type ExternalDataServiceOptions = {
  clock?: () => Date;
  logger?: Logger;
  mapper?: (record: MapidNormalizedRecord) => ExternalEntityWrite;
  persistenceEnabled?: boolean;
};

export class ExternalDataService {
  private readonly clock: () => Date;
  private readonly logger: Logger;
  private readonly mapper: (
    record: MapidNormalizedRecord,
  ) => ExternalEntityWrite;
  private readonly persistenceEnabled: boolean;

  constructor(
    private readonly adapter: MapidProviderAdapter,
    private readonly records: ExternalRecordPort,
    options: ExternalDataServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.logger = options.logger ?? defaultLogger;
    this.mapper = options.mapper ?? mapMapidRecordToExternalEntityInput;
    this.persistenceEnabled = options.persistenceEnabled ?? false;
  }

  async processExternalData(
    input: ExternalDataProcessInput,
  ): Promise<ExternalDataProcessResult> {
    const started = this.clock();
    const operation = input.dryRun ? "dry_run" : "persist";
    let recordsReceived = 0;
    let recordsValid = 0;
    let recordsInvalid = 0;
    let duplicateCount = 0;
    let requestId = "unavailable";

    try {
      const context = mapidRequestContextSchema.safeParse(input.context);
      if (!context.success || input.provider !== MAPID_PROVIDER) {
        throw new MapidError("MAPID_CONFIGURATION_ERROR");
      }

      requestId = context.data.request_id;

      if (!input.dryRun && !this.persistenceEnabled) {
        throw new MapidError("MAPID_CONFIGURATION_ERROR");
      }

      const raw = await this.adapter.fetch(input.query, context.data);
      const validated = this.adapter.validate(raw);
      const normalized = this.adapter.normalize(validated, context.data);

      recordsReceived = normalized.received_count;
      recordsValid = normalized.records.length;
      recordsInvalid = normalized.invalid_records.length;

      const duplicateRecords: ExternalDuplicateRecord[] = [];
      const newRecords: MapidNormalizedRecord[] = [];
      const batchKeys = new Set<string>();

      for (const record of normalized.records) {
        const key = [
          record.entity_kind,
          record.source_id,
          record.source_record_id,
        ].join(":");

        if (batchKeys.has(key)) {
          duplicateRecords.push(this.duplicate(record, "batch"));
          continue;
        }

        batchKeys.add(key);
        const exists = await this.records.existsBySourceRecordId(
          record.entity_kind,
          record.source_id,
          record.source_record_id,
        );

        if (exists) {
          duplicateRecords.push(this.duplicate(record, "repository"));
        } else {
          newRecords.push(record);
        }
      }

      let persistedRecords = 0;
      if (!input.dryRun) {
        for (const record of newRecords) {
          try {
            await this.records.createNormalizedRecord(this.mapper(record));
            persistedRecords += 1;
          } catch (error) {
            if (error instanceof RepositoryError && error.code === "CONFLICT") {
              duplicateRecords.push(this.duplicate(record, "constraint"));
              continue;
            }

            throw error;
          }
        }
      }

      duplicateCount = duplicateRecords.length;
      const finished = this.clock();
      const status = recordsInvalid > 0 ? "partial" : "ok";
      const metrics: ExternalIntegrationMetrics = {
        duplicates: duplicateCount,
        finished_at: finished.toISOString(),
        provider: MAPID_PROVIDER,
        records_invalid: recordsInvalid,
        records_received: recordsReceived,
        records_valid: recordsValid,
        started_at: started.toISOString(),
      };

      this.logger.info("External integration completed", {
        duplicate_count: duplicateCount,
        duration_ms: Math.max(0, finished.getTime() - started.getTime()),
        invalid_count: recordsInvalid,
        operation,
        provider: MAPID_PROVIDER,
        record_count: recordsReceived,
        request_id: requestId,
        status,
      });

      return {
        dry_run: input.dryRun,
        duplicate_records: duplicateRecords,
        invalid_records: normalized.invalid_records,
        metrics,
        new_records: newRecords.length -
          duplicateRecords.filter((record) => record.detected_by === "constraint")
            .length,
        normalized_records: normalized.records,
        parsed_records: normalized.records.length,
        persisted_records: persistedRecords,
        provider: MAPID_PROVIDER,
        status,
      };
    } catch (error) {
      const finished = this.clock();
      const mappedError = this.mapError(error);

      this.logger.error("External integration failed", {
        duplicate_count: duplicateCount,
        duration_ms: Math.max(0, finished.getTime() - started.getTime()),
        error_code: mappedError.code,
        invalid_count: recordsInvalid,
        operation,
        provider: MAPID_PROVIDER,
        record_count: recordsReceived,
        request_id: requestId,
        status: "error",
      });

      throw mappedError;
    }
  }

  private duplicate(
    record: MapidNormalizedRecord,
    detectedBy: ExternalDuplicateRecord["detected_by"],
  ): ExternalDuplicateRecord {
    return {
      detected_by: detectedBy,
      entity_kind: record.entity_kind,
      source_record_id: record.source_record_id,
    };
  }

  private mapError(error: unknown): MapidError {
    if (error instanceof MapidError) {
      return error;
    }

    if (error instanceof RepositoryError) {
      return new MapidError("MAPID_UPSTREAM_ERROR", {
        retryable: error.code === "DATABASE_ERROR",
      });
    }

    return new MapidError("MAPID_UPSTREAM_ERROR");
  }
}
