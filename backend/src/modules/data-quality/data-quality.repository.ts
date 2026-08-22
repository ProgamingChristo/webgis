import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { mapDatabaseError } from "@/src/repositories/errors";
import type { QualityRunRow, QualityCheckResultInput } from "./data-quality.types";
import type { DataEnvironment } from "@/src/modules/ingestion/ingestion.types";
import type { JsonObject } from "@/src/types/provenance";

export class DataQualityRepository {
  constructor(private client: SupabaseClient<Database>) {}

  async startRun(datasetVersionId: string, environment: DataEnvironment): Promise<QualityRunRow> {
    const { data, error } = await this.client
      .from("quality_runs")
      .insert([
        {
          dataset_version_id: datasetVersionId,
          environment: environment,
          status: "RUNNING",
        },
      ])
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "startRun");
    }
    return data;
  }

  async saveCheckResult(runId: string, result: QualityCheckResultInput): Promise<void> {
    const { error } = await this.client
      .from("quality_check_results")
      .insert([
        {
          quality_run_id: runId,
          check_code: result.check_code,
          category: result.category,
          status: result.status,
          is_critical: result.is_critical ?? false,
          message: result.message,
          total_records: result.total_records,
          affected_records: result.affected_records,
          details: (result.details ?? {}) as unknown as JsonObject,
        },
      ]);

    if (error) {
      throw mapDatabaseError(error, "saveCheckResult");
    }
  }

  async finalizeRun(
    runId: string, 
    totals: {
      total_checks: number;
      passed_checks: number;
      warning_checks: number;
      failed_checks: number;
      critical_failures: number;
    }
  ): Promise<QualityRunRow> {
    const status = totals.critical_failures > 0 ? "FAIL" : (totals.failed_checks > 0 ? "FAIL" : (totals.warning_checks > 0 ? "WARN" : "PASS"));
    
    const { data, error } = await this.client
      .from("quality_runs")
      .update({
        ...totals,
        status,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .select("*")
      .single();

    if (error) {
      throw mapDatabaseError(error, "finalizeRun");
    }
    return data;
  }
}

