import { z } from "zod";
import { ApplicationError } from "@/src/lib/errors";
import { ANALYTICS_CATEGORY_SLUGS, MAX_ANALYTICS_WINDOW_DAYS } from "./analytics.constants";
import type { AnalyticsQuery } from "./analytics.types";

const categorySchema = z.enum(ANALYTICS_CATEGORY_SLUGS);
const regionIdSchema = z.string().regex(/^jakarta-(barat|pusat|selatan|timur|utara)$/);
const finiteCoordinate = z.coerce.number().finite();

const analyticsInputSchema = z.object({
  category: categorySchema,
  days: z.coerce.number().int().refine((value) => value === 7 || value === 30).optional(),
  start_at: z.string().datetime({ offset: true }).optional(),
  end_at: z.string().datetime({ offset: true }).optional(),
  region_ids: z.array(regionIdSchema).min(1).max(5).optional(),
  west: finiteCoordinate.min(-180).max(180).optional(),
  south: finiteCoordinate.min(-90).max(90).optional(),
  east: finiteCoordinate.min(-180).max(180).optional(),
  north: finiteCoordinate.min(-90).max(90).optional(),
  limit: z.coerce.number().int().min(1).max(5).default(5),
}).strict().superRefine((value, context) => {
  const customWindow = value.start_at !== undefined || value.end_at !== undefined;
  if (customWindow && (!value.start_at || !value.end_at)) {
    context.addIssue({ code: "custom", message: "start_at and end_at are required together" });
  }
  if (customWindow && value.days !== undefined) {
    context.addIssue({ code: "custom", message: "days cannot be combined with a custom window" });
  }
  const bboxValues = [value.west, value.south, value.east, value.north];
  const hasBbox = bboxValues.some((item) => item !== undefined);
  if (hasBbox && bboxValues.some((item) => item === undefined)) {
    context.addIssue({ code: "custom", message: "bbox requires west, south, east, and north" });
  }
  if (value.region_ids?.length && hasBbox) {
    context.addIssue({ code: "custom", message: "region_ids and bbox are mutually exclusive" });
  }
  if (!value.region_ids?.length && !hasBbox) {
    context.addIssue({ code: "custom", message: "region_ids or bbox is required" });
  }
  if (hasBbox && value.west! >= value.east!) {
    context.addIssue({ code: "custom", message: "west must be less than east" });
  }
  if (hasBbox && value.south! >= value.north!) {
    context.addIssue({ code: "custom", message: "south must be less than north" });
  }
  if (hasBbox && (value.east! - value.west! > 1 || value.north! - value.south! > 1)) {
    context.addIssue({ code: "custom", message: "bbox exceeds the analytics pilot limit" });
  }
});

export function parseAnalyticsSearchParams(params: URLSearchParams, now = new Date()): AnalyticsQuery {
  const regionIds = params.getAll("region_ids")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const raw = {
    category: params.get("category") ?? undefined,
    days: params.get("days") ?? undefined,
    start_at: params.get("start_at") ?? undefined,
    end_at: params.get("end_at") ?? undefined,
    region_ids: regionIds.length ? [...new Set(regionIds)] : undefined,
    west: params.get("west") ?? undefined,
    south: params.get("south") ?? undefined,
    east: params.get("east") ?? undefined,
    north: params.get("north") ?? undefined,
    limit: params.get("limit") ?? undefined,
  };
  const parsed = analyticsInputSchema.safeParse(raw);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");

  const end = parsed.data.end_at ? new Date(parsed.data.end_at) : now;
  const start = parsed.data.start_at
    ? new Date(parsed.data.start_at)
    : new Date(end.getTime() - (parsed.data.days ?? 30) * 86_400_000);
  if (
    Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end ||
    end.getTime() - start.getTime() > MAX_ANALYTICS_WINDOW_DAYS * 86_400_000 ||
    end.getTime() > now.getTime() + 5 * 60_000
  ) throw new ApplicationError("VALIDATION_ERROR");

  const hasBbox = parsed.data.west !== undefined;
  return {
    category: parsed.data.category,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    region_ids: parsed.data.region_ids ?? [],
    bbox: hasBbox ? {
      west: parsed.data.west!,
      south: parsed.data.south!,
      east: parsed.data.east!,
      north: parsed.data.north!,
    } : null,
    limit: parsed.data.limit,
  };
}

export const analyticsInterpretationRequestSchema = z.object({
  query: z.string().min(1).max(2_000),
  region_id: regionIdSchema,
}).strict();
