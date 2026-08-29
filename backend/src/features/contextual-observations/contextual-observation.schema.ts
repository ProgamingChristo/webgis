import type { NextRequest } from "next/server";
import { z } from "zod";

import { CONTEXTUAL_SOURCES } from "@/src/features/contextual-observations/contextual-observation.types";
import { ApplicationError } from "@/src/lib/errors";
import { getStrictSearchParams } from "@/src/modules/spatial/spatial-api";
import { latitudeSchema, longitudeSchema } from "@/src/schemas/spatial.schema";

const queryNumber = (schema: z.ZodNumber) => z.coerce.number().pipe(schema);

export const contextualObservationQuerySchema = z.object({
  source: z.enum(CONTEXTUAL_SOURCES),
  west: queryNumber(longitudeSchema),
  south: queryNumber(latitudeSchema),
  east: queryNumber(longitudeSchema),
  north: queryNumber(latitudeSchema),
  limit: queryNumber(z.number().int().positive().max(250)).default(250),
  offset: queryNumber(z.number().int().nonnegative().max(10_000)).default(0),
}).strict().superRefine((value, context) => {
  if (value.west >= value.east || value.south >= value.north) {
    context.addIssue({ code: "custom", message: "bbox ordering is invalid" });
  }
  if (value.east - value.west > 10 || value.north - value.south > 10) {
    context.addIssue({ code: "custom", message: "bbox is too large" });
  }
});

export type ContextualObservationQuery = z.infer<typeof contextualObservationQuerySchema>;

export function parseContextualObservationRequest(
  request: NextRequest,
): ContextualObservationQuery {
  const parsed = contextualObservationQuerySchema.safeParse(
    getStrictSearchParams(request),
  );
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
