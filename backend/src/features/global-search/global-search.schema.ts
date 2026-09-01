import { z } from "zod";

import { ApplicationError } from "@/src/lib/errors";
import { getStrictSearchParams } from "@/src/modules/spatial/spatial-api";
import type { NextRequest } from "next/server";
import { latitudeSchema, longitudeSchema } from "@/src/schemas/spatial.schema";
import {
  MAX_GLOBAL_SEARCH_REGIONS,
} from "@/src/features/global-search/global-search-regions";
import { SEARCH_SCOPE_TYPES } from "@/src/features/global-search/global-search.types";

const queryNumber = (schema: z.ZodNumber) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().pipe(schema),
);

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional(),
);

const regionIdsSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    if (!value.trim()) return [];
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  },
  z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    .max(MAX_GLOBAL_SEARCH_REGIONS)
    .default([]),
);

export const globalSearchQuerySchema = z.object({
  q: optionalText(120).default(""),
  scope: z.enum(SEARCH_SCOPE_TYPES).default("CURRENT_VIEWPORT"),
  region_ids: regionIdsSchema,
  location_text: optionalText(80),
  category: optionalText(80),
  max_budget: queryNumber(z.number().int().min(1_000).max(10_000_000)).optional(),
  open_now: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  max_walking_minutes: queryNumber(z.number().int().min(5).max(30)).optional(),
  origin_longitude: queryNumber(longitudeSchema).optional(),
  origin_latitude: queryNumber(latitudeSchema).optional(),
  origin_source: z.enum(["USER_LOCATION", "SELECTED_POINT", "EXPLICIT_ORIGIN"]).optional(),
  west: queryNumber(longitudeSchema).optional(),
  south: queryNumber(latitudeSchema).optional(),
  east: queryNumber(longitudeSchema).optional(),
  north: queryNumber(latitudeSchema).optional(),
  limit: queryNumber(z.number().int().positive().max(100)).default(50),
  offset: queryNumber(z.number().int().nonnegative().max(100_000)).default(0),
}).strict().superRefine((value, context) => {
  const bbox = [value.west, value.south, value.east, value.north];
  const bboxCount = bbox.filter((part) => part !== undefined).length;
  if (bboxCount !== 0 && bboxCount !== 4) {
    context.addIssue({ code: "custom", message: "bbox must be complete" });
  }
  if (
    bboxCount === 4 &&
    (value.west! >= value.east! || value.south! >= value.north!)
  ) {
    context.addIssue({ code: "custom", message: "bbox ordering is invalid" });
  }
  if (
    bboxCount === 4 &&
    (value.east! - value.west! > 10 || value.north! - value.south! > 10)
  ) {
    context.addIssue({ code: "custom", message: "bbox is too large" });
  }
  if (
    value.scope === "CURRENT_VIEWPORT" && bboxCount !== 4 &&
    !value.location_text && !value.q
  ) {
    context.addIssue({ code: "custom", message: "current viewport requires bbox" });
  }
  if (value.scope === "REGION" && value.region_ids.length > 1) {
    context.addIssue({ code: "custom", message: "region scope accepts one region" });
  }
  if (value.scope === "MULTI_REGION" && value.region_ids.length < 2) {
    context.addIssue({ code: "custom", message: "multi-region scope requires multiple regions" });
  }
  if (value.scope === "GLOBAL" && (!value.q.trim() || value.region_ids.length > 0)) {
    context.addIssue({ code: "custom", message: "global scope requires a query and no regions" });
  }
  if (new Set(value.region_ids).size !== value.region_ids.length) {
    context.addIssue({ code: "custom", message: "region identifiers must be unique" });
  }
  const originCount = [value.origin_longitude, value.origin_latitude]
    .filter((part) => part !== undefined).length;
  if (originCount !== 0 && originCount !== 2) {
    context.addIssue({ code: "custom", message: "origin coordinates must be complete" });
  }
  if (value.max_walking_minutes !== undefined && originCount !== 2) {
    context.addIssue({ code: "custom", message: "walking constraint requires origin" });
  }
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

export function parseGlobalSearchRequest(request: NextRequest): GlobalSearchQuery {
  const parsed = globalSearchQuerySchema.safeParse(getStrictSearchParams(request));
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
