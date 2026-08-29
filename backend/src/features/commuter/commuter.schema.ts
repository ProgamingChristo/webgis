import { z } from "zod";

export const MAX_WALKING_CANDIDATES = 30;
export const WALKING_SPEED_METERS_PER_SECOND = 1.4;
export const MAX_GRAPH_SNAP_METERS = 75;

export const commuterConstraintQuerySchema = z.object({
  max_budget: z.coerce.number().int().min(1_000).max(10_000_000).optional(),
  open_now: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  max_walking_minutes: z.coerce.number().int().min(5).max(30).optional(),
  origin_longitude: z.coerce.number().min(-180).max(180).optional(),
  origin_latitude: z.coerce.number().min(-90).max(90).optional(),
  origin_source: z.enum(["USER_LOCATION", "SELECTED_POINT", "EXPLICIT_ORIGIN"]).optional(),
}).strict().superRefine((value, context) => {
  const coordinateCount = [value.origin_longitude, value.origin_latitude]
    .filter((part) => part !== undefined).length;
  if (coordinateCount !== 0 && coordinateCount !== 2) {
    context.addIssue({ code: "custom", message: "origin coordinates must be complete" });
  }
  if (value.max_walking_minutes !== undefined && coordinateCount !== 2) {
    context.addIssue({ code: "custom", message: "walking constraint requires origin" });
  }
});

export const serviceAreaRequestSchema = z.object({
  origin: z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
  }).strict(),
  max_minutes: z.number().int().min(5).max(30),
}).strict();

export const graphHealthQuerySchema = z.object({
  environment: z.literal("PRODUCTION").default("PRODUCTION"),
}).strict();
