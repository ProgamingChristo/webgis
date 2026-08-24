import { z } from "zod";

export const contextualBannerQuerySchema = z.object({
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
  radius_meters: z.coerce.number().positive().max(20000).optional(),
  category: z.string().trim().optional(),
  query: z.string().trim().optional(),
  open_now: z.coerce.boolean().optional(),
  max_walking_minutes: z.coerce.number().positive().max(120).optional(),
});

export type ContextualBannerQuerySchemaType = z.infer<typeof contextualBannerQuerySchema>;
