import { z } from "zod";

export const campaignEventContextSchema = z
  .object({
    surface: z.string().max(64).optional(),
    request_id: z.string().max(128).optional(),
    referrer: z.string().max(128).optional(),
    source: z.string().max(64).optional(),
    query_context: z
      .object({
        category: z.string().max(64).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const recordCampaignEventSchema = z
  .object({
    event_type: z.enum([
      "IMPRESSION",
      "SPONSORED_PIN_CLICK",
      "PROFILE_OPEN",
      "ROUTE_REQUEST",
    ], {
      message: "Tipe event harus salah satu dari: IMPRESSION, SPONSORED_PIN_CLICK, PROFILE_OPEN, ROUTE_REQUEST.",
    }),
    campaign_id: z
      .string()
      .uuid({ message: "Campaign ID harus berformat UUID valid." }),
    creative_id: z
      .string()
      .uuid({ message: "Creative ID harus berformat UUID valid." })
      .optional()
      .nullable(),
    placement: z.enum([
      "SPONSORED_PIN",
      "CONTEXTUAL_BANNER",
      "PROFILE_POSTER",
    ], {
      message: "Tipe placement harus salah satu dari: SPONSORED_PIN, CONTEXTUAL_BANNER, PROFILE_POSTER.",
    }),
    session_key: z
      .string()
      .min(1, { message: "Session key wajib diisi." })
      .max(128, { message: "Session key maksimal 128 karakter." }),
    dedup_key: z
      .string()
      .max(256, { message: "Dedup key maksimal 256 karakter." })
      .optional(),
    context: campaignEventContextSchema.optional(),
  })
  .strict();

export type RecordCampaignEventSchemaType = z.infer<typeof recordCampaignEventSchema>;
