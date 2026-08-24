import { z } from "zod";

export const campaignAnalyticsQuerySchema = z
  .object({
    from: z.string().datetime({ message: "Parameter 'from' harus berupa format ISO timestamp valid." }).optional(),
    to: z.string().datetime({ message: "Parameter 'to' harus berupa format ISO timestamp valid." }).optional(),
    placement: z
      .enum(["SPONSORED_PIN", "CONTEXTUAL_BANNER", "PROFILE_POSTER"], {
        message: "Placement tidak valid.",
      })
      .optional(),
  })
  .strict();

export type CampaignAnalyticsQuerySchemaType = z.infer<typeof campaignAnalyticsQuerySchema>;
