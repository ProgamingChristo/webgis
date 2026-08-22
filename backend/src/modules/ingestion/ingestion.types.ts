import type { Database } from "@/src/types/database.types";
import type { JsonObject } from "@/src/types/provenance";

export type DataEnvironment = Database["public"]["Enums"]["data_environment"];
export type ImportJobStatus = Database["public"]["Enums"]["import_job_status"];

export interface DataSource {
  id: string;
  code: string;
  name: string;
  description: string | null;
  environment: DataEnvironment;
  is_active: boolean;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface ImportJobMetrics {
  total_records: number;
  processed_records: number;
  failed_records: number;
  inserted_records: number;
  updated_records: number;
}

export interface ImportJob {
  id: string;
  data_source_id: string;
  environment: DataEnvironment;
  status: ImportJobStatus;
  started_at: string | null;
  completed_at: string | null;
  is_dry_run: boolean;
  
  metrics: ImportJobMetrics;
  
  error_log: JsonObject | null;
  metadata: JsonObject;
  
  created_at: string;
  updated_at: string;
}

export interface CreateImportJobInput {
  data_source_id: string;
  environment: DataEnvironment;
  is_dry_run?: boolean;
  metadata?: JsonObject;
}

export interface UpdateImportJobInput {
  status?: ImportJobStatus;
  started_at?: string;
  completed_at?: string;
  metrics?: Partial<ImportJobMetrics>;
  error_log?: JsonObject | null;
  metadata?: JsonObject;
}
