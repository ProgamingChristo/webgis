import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  ACCESSIBILITY_EVIDENCE_CATEGORIES,
  ACCESSIBILITY_EVIDENCE_SOURCES,
  ACCESSIBILITY_EVIDENCE_SUBCATEGORIES,
  ACCESSIBILITY_RELATION_STATUSES,
  ACCESSIBILITY_VALIDATION_STATUSES,
} from "@/src/features/accessibility-evidence/accessibility-evidence.types";
import { ApplicationError } from "@/src/lib/errors";
import { getStrictSearchParams } from "@/src/modules/spatial/spatial-api";
import { latitudeSchema, longitudeSchema } from "@/src/schemas/spatial.schema";

const queryNumber = (schema: z.ZodNumber) => z.coerce.number().pipe(schema);

export const accessibilityEvidenceIdSchema = z
  .string()
  .min(8)
  .max(220)
  .regex(/^(MAPID_ACTIVITY|GETRA_COMMUNITY):[A-Za-z0-9._:-]+$/);

export const accessibilityEvidenceQuerySchema = z.object({
  west: queryNumber(longitudeSchema),
  south: queryNumber(latitudeSchema),
  east: queryNumber(longitudeSchema),
  north: queryNumber(latitudeSchema),
  source_type: z.enum(ACCESSIBILITY_EVIDENCE_SOURCES).optional(),
  category: z.enum(ACCESSIBILITY_EVIDENCE_CATEGORIES).optional(),
  validation_status: z.enum(ACCESSIBILITY_VALIDATION_STATUSES).optional(),
  days: z.coerce.number().int().positive().max(365).optional(),
  limit: queryNumber(z.number().int().positive().max(250)).default(100),
  offset: queryNumber(z.number().int().nonnegative().max(10_000)).default(0),
}).strict().superRefine((value, context) => {
  if (value.west >= value.east || value.south >= value.north) {
    context.addIssue({ code: "custom", message: "bbox ordering is invalid" });
  }
  if (value.east - value.west > 10 || value.north - value.south > 10) {
    context.addIssue({ code: "custom", message: "bbox is too large" });
  }
});

export const accessibilityNeedQuerySchema = accessibilityEvidenceQuerySchema
  .omit({ limit: true, offset: true });

export const accessibilityReviewRequestSchema = z.object({
  validation_status: z.enum(ACCESSIBILITY_VALIDATION_STATUSES),
  confirmed_category: z.enum(ACCESSIBILITY_EVIDENCE_CATEGORIES).nullable().optional(),
  confirmed_subcategory: z.enum(ACCESSIBILITY_EVIDENCE_SUBCATEGORIES).nullable().optional(),
  review_reason: z.string().trim().max(500).nullable().optional(),
  candidate_network_feature_id: z.string().uuid().nullable().optional(),
  relation_status: z.enum(ACCESSIBILITY_RELATION_STATUSES).default("CANDIDATE"),
}).strict();

export type AccessibilityEvidenceQuery =
  z.infer<typeof accessibilityEvidenceQuerySchema>;
export type AccessibilityNeedQuery =
  z.infer<typeof accessibilityNeedQuerySchema>;
export type AccessibilityReviewRequest =
  z.infer<typeof accessibilityReviewRequestSchema>;

export function parseAccessibilityEvidenceQuery(
  request: NextRequest,
): AccessibilityEvidenceQuery {
  const parsed = accessibilityEvidenceQuerySchema.safeParse(
    getStrictSearchParams(request),
  );
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}

export function parseAccessibilityNeedQuery(
  request: NextRequest,
): AccessibilityNeedQuery {
  const parsed = accessibilityNeedQuerySchema.safeParse(
    getStrictSearchParams(request),
  );
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}

export function parseAccessibilityEvidenceId(value: string): string {
  const parsed = accessibilityEvidenceIdSchema.safeParse(value);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
