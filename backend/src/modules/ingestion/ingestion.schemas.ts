import { z } from "zod";
import { Constants } from "@/src/types/database.types";

export const dataEnvironmentSchema = z.enum(
  Constants.public.Enums.data_environment,
);

export const importJobStatusSchema = z.enum(
  Constants.public.Enums.import_job_status,
);

export const createImportJobSchema = z.object({
  data_source_id: z.string().uuid("Invalid data_source_id format"),
  environment: dataEnvironmentSchema,
  is_dry_run: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const updateImportJobSchema = z.object({
  status: importJobStatusSchema.optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  metrics: z
    .object({
      total_records: z.number().int().min(0).optional(),
      processed_records: z.number().int().min(0).optional(),
      failed_records: z.number().int().min(0).optional(),
      inserted_records: z.number().int().min(0).optional(),
      updated_records: z.number().int().min(0).optional(),
    })
    .optional(),
  error_log: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
