import { z } from "zod";

export const createCreativeSchema = z.object({
  creative_type: z.enum(["SPONSORED_PIN", "CONTEXTUAL_BANNER", "PROFILE_POSTER"]),
  headline: z.string().trim().min(1, "Headline wajib diisi").max(50, "Headline maksimal 50 karakter"),
  description: z.string().trim().max(100, "Deskripsi maksimal 100 karakter").optional().nullable(),
  cta_type: z.enum(["VIEW_PROFILE", "REQUEST_ROUTE"]),
});

export const updateCreativeSchema = z.object({
  headline: z.string().trim().min(1, "Headline wajib diisi").max(50, "Headline maksimal 50 karakter").optional(),
  description: z.string().trim().max(100, "Deskripsi maksimal 100 karakter").optional().nullable(),
  cta_type: z.enum(["VIEW_PROFILE", "REQUEST_ROUTE"]).optional(),
});

export type CreateCreativeInput = z.infer<typeof createCreativeSchema>;
export type UpdateCreativeInput = z.infer<typeof updateCreativeSchema>;
