import { z } from "zod";

export const menuItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, { message: "Nama menu wajib diisi." }).max(100),
  price: z.number().nonnegative({ message: "Harga menu tidak boleh negatif." }),
  category: z.string().trim().max(50).optional(),
  description: z.string().trim().max(200).optional(),
  photo_url: z.string().optional().or(z.literal("")),
  is_available: z.boolean().default(true),
  tag: z.string().trim().max(30).optional(),
});

export type MenuItem = z.infer<typeof menuItemSchema>;

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
        menu_items: z.array(menuItemSchema).max(30).optional(),
      })
      .optional(),
  })
  .strict();

export type UpdateMerchantProfileInput = z.infer<typeof updateMerchantProfileSchema>;

