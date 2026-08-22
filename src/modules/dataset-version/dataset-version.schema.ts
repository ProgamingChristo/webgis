import { z } from "zod";
import { dataEnvironmentSchema } from "@/src/modules/ingestion/ingestion.schemas";

export const datasetVersionStatusSchema = z.enum([
  "DRAFT",
  "VALIDATING",
  "READY",
  "ACTIVE",
  "ARCHIVED",
  "VALIDATION_FAILED",
]);

export const createDatasetVersionSchema = z.object({
  code: z.string().min(1),
  version: z.string().min(1),
  environment: dataEnvironmentSchema,
  status: datasetVersionStatusSchema.optional(),
  description: z.string().nullable().optional(),
  manifest: z.record(z.string(), z.unknown()).optional(),
  validated_at: z.string().datetime().nullable().optional(),
  activated_at: z.string().datetime().nullable().optional(),
});

export const updateDatasetVersionSchema = createDatasetVersionSchema.partial().extend({
  status: datasetVersionStatusSchema.optional(),
  manifest: z.record(z.string(), z.unknown()).optional(),
});
