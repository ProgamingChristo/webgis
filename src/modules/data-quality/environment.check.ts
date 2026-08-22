import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import type { IQualityChecker, QualityCheckResultInput } from "./data-quality.types";
import type { DataEnvironment } from "@/src/modules/ingestion/ingestion.types";

export class EnvironmentConsistencyCheck implements IQualityChecker {
  constructor(
    private client: SupabaseClient<Database>,
    private targetEnvironment: DataEnvironment,
    private tablesToCheck: string[]
  ) {}

  async runCheck(): Promise<QualityCheckResultInput> {
    let totalAnomalies = 0;
    const details: Record<string, number> = {};

    for (const table of this.tablesToCheck) {
      // Use raw RPC or simple count via Supabase JS if column exists
      // We assume every checked table has an 'environment' column
      const { count, error } = await this.client
        .from(table as any)
        .select("*", { count: "exact", head: true })
        .neq("environment", this.targetEnvironment);

      if (error) {
        throw new Error(`Failed to query environment on ${table}: ${error.message}`);
      }

      if (count && count > 0) {
        totalAnomalies += count;
        details[table] = count;
      }
    }

    if (totalAnomalies > 0) {
      return {
        check_code: "CHK_ENV_CONSISTENCY",
        category: "ENVIRONMENT",
        status: "FAIL",
        is_critical: true,
        message: `Found ${totalAnomalies} records not matching environment '${this.targetEnvironment}'`,
        affected_records: totalAnomalies,
        details,
      };
    }

    return {
      check_code: "CHK_ENV_CONSISTENCY",
      category: "ENVIRONMENT",
      status: "PASS",
      message: `All records across ${this.tablesToCheck.length} tables match environment '${this.targetEnvironment}'`,
    };
  }
}
