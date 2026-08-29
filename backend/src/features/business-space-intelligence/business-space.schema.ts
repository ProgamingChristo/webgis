import { z } from "zod";
import { ApplicationError } from "@/src/lib/errors";
import { ANALYTICS_CATEGORY_SLUGS } from "@/src/features/demand-intelligence";
import {
  BUSINESS_SPACE_MAX_CANDIDATES,
  BUSINESS_SPACE_MAX_COMPARISON,
} from "./business-space.constants";

const categorySchema = z.enum(ANALYTICS_CATEGORY_SLUGS);
const regionIdSchema = z.string().regex(/^jakarta-(barat|pusat|selatan|timur|utara)$/);
const uuidSchema = z.string().uuid();
const finiteCoordinate = z.coerce.number().finite();
const propertyTransactionSchema = z.enum(["DIJUAL", "DISEWA"]);

const candidateQuerySchema = z.object({
  category: categorySchema.default("bakso"),
  days: z.coerce.number().int().refine((value) => value === 7 || value === 30).default(30),
  property_category: z.string().trim().min(1).max(80).optional(),
  q: z.string().trim().min(1).max(160).optional(),
  region_id: regionIdSchema.optional(),
  transaction_type: propertyTransactionSchema.optional(),
  west: finiteCoordinate.min(-180).max(180).optional(),
  south: finiteCoordinate.min(-90).max(90).optional(),
  east: finiteCoordinate.min(-180).max(180).optional(),
  north: finiteCoordinate.min(-90).max(90).optional(),
  limit: z.coerce.number().int().min(1).max(BUSINESS_SPACE_MAX_CANDIDATES).default(12),
  offset: z.coerce.number().int().min(0).max(500).default(0),
}).strict().superRefine((value, context) => {
  const bboxValues = [value.west, value.south, value.east, value.north];
  const hasBbox = bboxValues.some((item) => item !== undefined);
  if (hasBbox && bboxValues.some((item) => item === undefined)) {
    context.addIssue({ code: "custom", message: "bbox requires west, south, east, and north" });
  }
  if (!value.region_id && !hasBbox) {
    context.addIssue({ code: "custom", message: "region_id or bbox is required" });
  }
  if (hasBbox && value.west! >= value.east!) context.addIssue({ code: "custom", message: "west must be less than east" });
  if (hasBbox && value.south! >= value.north!) context.addIssue({ code: "custom", message: "south must be less than north" });
  if (hasBbox && (value.east! - value.west! > 1 || value.north! - value.south! > 1)) {
    context.addIssue({ code: "custom", message: "bbox exceeds pilot limit" });
  }
});

export type BusinessSpaceCandidateQuery = z.infer<typeof candidateQuerySchema>;

export const businessSpaceDetailParamsSchema = z.object({
  candidateId: uuidSchema,
}).strict();

export const businessSpaceComparisonSchema = z.object({
  candidate_ids: z.array(uuidSchema).min(2).max(BUSINESS_SPACE_MAX_COMPARISON),
  category: categorySchema,
  days: z.number().int().refine((value) => value === 7 || value === 30),
}).strict();

export const businessSpaceInsightSchema = businessSpaceComparisonSchema.extend({
  question: z.string().min(1).max(600).optional(),
}).strict();

export type BusinessSpaceComparisonInput = z.infer<typeof businessSpaceComparisonSchema>;
export type BusinessSpaceInsightInput = z.infer<typeof businessSpaceInsightSchema>;

export function parseBusinessSpaceCandidateQuery(params: URLSearchParams): BusinessSpaceCandidateQuery {
  const parsed = candidateQuerySchema.safeParse({
    category: params.get("category") ?? undefined,
    days: params.get("days") ?? undefined,
    property_category: params.get("property_category") ?? undefined,
    q: params.get("q") ?? undefined,
    region_id: params.get("region_id") ?? undefined,
    transaction_type: params.get("transaction_type") ?? undefined,
    west: params.get("west") ?? undefined,
    south: params.get("south") ?? undefined,
    east: params.get("east") ?? undefined,
    north: params.get("north") ?? undefined,
    limit: params.get("limit") ?? undefined,
    offset: params.get("offset") ?? undefined,
  });
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
