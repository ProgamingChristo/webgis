import type { DataQualityRepository } from "./data-quality.repository";
import type { IQualityChecker, QualityRunRow } from "./data-quality.types";
import type { DataEnvironment } from "@/src/modules/ingestion/ingestion.types";

export class QualityCheckRunner {
  constructor(
    private repo: DataQualityRepository,
    private checkers: IQualityChecker[]
  ) {}

  async runAll(datasetVersionId: string, environment: DataEnvironment): Promise<QualityRunRow> {
    const run = await this.repo.startRun(datasetVersionId, environment);

    let passed = 0;
    let warnings = 0;
    let failed = 0;
    let criticalFailures = 0;

    for (const checker of this.checkers) {
      try {
        const result = await checker.runCheck();
        
        await this.repo.saveCheckResult(run.id, result);

        if (result.status === "PASS") passed++;
        if (result.status === "WARN") warnings++;
        if (result.status === "FAIL") {
          failed++;
          if (result.is_critical) {
            criticalFailures++;
          }
        }
      } catch (err: any) {
        // Unhandled checker error
        await this.repo.saveCheckResult(run.id, {
          check_code: "SYSTEM_ERROR",
          category: "SYSTEM",
          status: "FAIL",
          is_critical: true,
          message: `Checker threw unhandled exception: ${err?.message}`,
        });
        failed++;
        criticalFailures++;
      }
    }

    return await this.repo.finalizeRun(run.id, {
      total_checks: this.checkers.length,
      passed_checks: passed,
      warning_checks: warnings,
      failed_checks: failed,
      critical_failures: criticalFailures,
    });
  }
}
