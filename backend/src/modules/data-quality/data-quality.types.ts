import type { Database } from "@/src/types/database.types";
import type { JsonObject } from "@/src/types/provenance";

export type QualityRunRow = Database["public"]["Tables"]["quality_runs"]["Row"];
export type QualityCheckResultRow = Database["public"]["Tables"]["quality_check_results"]["Row"];
export type QualityRunStatus = Database["public"]["Enums"]["quality_run_status"];

export interface QualityCheckResultInput {
  check_code: string;
  category: string;
  status: "PASS" | "WARN" | "FAIL";
  is_critical?: boolean;
  message: string;
  total_records?: number;
  affected_records?: number;
  details?: JsonObject;
}

export interface IQualityChecker {
  runCheck(): Promise<QualityCheckResultInput>;
}
