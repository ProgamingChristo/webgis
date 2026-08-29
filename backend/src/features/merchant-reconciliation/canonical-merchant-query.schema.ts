import { z } from "zod";

import { ApplicationError } from "@/src/lib/errors";
import {
  latitudeSchema,
  longitudeSchema,
} from "@/src/schemas/spatial.schema";

export const CANONICAL_MERCHANT_VIEWPORT_LIMIT = 250;

const queryNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().pipe(schema),
  );

export const canonicalMerchantQuerySchema = z
  .object({
    east: queryNumber(longitudeSchema),
    limit: queryNumber(
      z.number().int().positive().max(CANONICAL_MERCHANT_VIEWPORT_LIMIT),
    ).default(100),
    north: queryNumber(latitudeSchema),
    offset: queryNumber(z.number().int().nonnegative().max(100_000)).default(0),
    south: queryNumber(latitudeSchema),
    west: queryNumber(longitudeSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.west >= value.east) {
      context.addIssue({ code: "custom", message: "west must be less than east" });
    }
    if (value.south >= value.north) {
      context.addIssue({ code: "custom", message: "south must be less than north" });
    }
    if (value.east - value.west > 10 || value.north - value.south > 10) {
      context.addIssue({ code: "custom", message: "viewport is too large" });
    }
  });

export type CanonicalMerchantQuery = z.infer<typeof canonicalMerchantQuerySchema>;

export function parseCanonicalMerchantQuery(input: unknown): CanonicalMerchantQuery {
  const parsed = canonicalMerchantQuerySchema.safeParse(input);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
