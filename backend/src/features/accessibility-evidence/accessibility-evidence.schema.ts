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

const accessibilityQueryBaseSchema = z.object({
  west: queryNumber(longitudeSchema),
  south: queryNumber(latitudeSchema),
  east: queryNumber(longitudeSchema),
  north: queryNumber(latitudeSchema),
  source_type: z.enum(ACCESSIBILITY_EVIDENCE_SOURCES).optional(),
  category: z.enum(ACCESSIBILITY_EVIDENCE_CATEGORIES).optional(),
  validation_status: z.enum(ACCESSIBILITY_VALIDATION_STATUSES).optional(),
  days: z.coerce.number().int().positive().max(365).optional(),
});

function refineAccessibilityBbox<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, context) => {
    const query = value as {
      west: number;
      south: number;
      east: number;
      north: number;
    };
    if (query.west >= query.east || query.south >= query.north) {
      context.addIssue({ code: "custom", message: "bbox ordering is invalid" });
    }
    if (query.east - query.west > 10 || query.north - query.south > 10) {
      context.addIssue({ code: "custom", message: "bbox is too large" });
    }
  });
}

export const accessibilityEvidenceQuerySchema = refineAccessibilityBbox(
  accessibilityQueryBaseSchema.extend({
  limit: queryNumber(z.number().int().positive().max(250)).default(100),
  offset: queryNumber(z.number().int().nonnegative().max(10_000)).default(0),
  }).strict(),
);

export const accessibilityNeedQuerySchema = refineAccessibilityBbox(
  accessibilityQueryBaseSchema.strict(),
);

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
