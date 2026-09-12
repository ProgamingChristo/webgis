import { z } from "zod";

export const updateMerchantProfileSchema = z
  .object({
    description: z
      .string()
      .trim()
      .max(1000, { message: "Deskripsi maksimal 1000 karakter." })
      .optional(),
    opening_hours: z
      .record(z.string(), z.unknown())
      .optional(),
    metadata: z
      .object({
        phone: z.string().trim().max(30).optional(),
        facilities: z.array(z.string().trim().max(50)).optional(),
        payment_methods: z.array(z.string().trim().max(50)).optional(),
        social_media: z.record(z.string(), z.string()).optional(),
        public_media: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
  })
  .strict();

export type UpdateMerchantProfileInput = z.infer<typeof updateMerchantProfileSchema>;
