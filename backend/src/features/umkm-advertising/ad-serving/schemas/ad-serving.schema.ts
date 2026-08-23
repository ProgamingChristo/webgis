import { z } from "zod";

export const servingContextSchema = z
  .object({
    longitude: z
      .number()
      .min(-180, { message: "Longitude minimal -180." })
      .max(180, { message: "Longitude maksimal 180." })
      .refine((val) => Number.isFinite(val), { message: "Longitude harus bilangan valid." }),
    latitude: z
      .number()
      .min(-90, { message: "Latitude minimal -90." })
      .max(90, { message: "Latitude maksimal 90." })
      .refine((val) => Number.isFinite(val), { message: "Latitude harus bilangan valid." }),
  })
  .strict();

export const queryCandidatesSchema = z
  .object({
    longitude: z.coerce
      .number()
      .min(-180, { message: "Longitude minimal -180." })
      .max(180, { message: "Longitude maksimal 180." })
      .refine((val) => Number.isFinite(val), { message: "Longitude harus bilangan valid." }),
    latitude: z.coerce
      .number()
      .min(-90, { message: "Latitude minimal -90." })
      .max(90, { message: "Latitude maksimal 90." })
      .refine((val) => Number.isFinite(val), { message: "Latitude harus bilangan valid." }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5),
  });

export type ServingContextSchemaType = z.infer<typeof servingContextSchema>;
export type QueryCandidatesSchemaType = z.infer<typeof queryCandidatesSchema>;
