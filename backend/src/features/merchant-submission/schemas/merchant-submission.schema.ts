import { z } from "zod";

export const pointGeometrySchema = z
  .object({
    type: z.literal("Point"),
    coordinates: z
      .tuple([
        z.number().min(-180).max(180, { message: "Longitude harus antara -180 dan 180." }),
        z.number().min(-90).max(90, { message: "Latitude harus antara -90 dan 90." }),
      ])
      .refine(
        ([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat),
        { message: "Koordinat lokasi harus berupa angka riil valid." }
      ),
  })
  .strict();

export const createMerchantSubmissionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Nama usaha minimal 2 karakter." })
      .max(128, { message: "Nama usaha maksimal 128 karakter." }),
    category: z
      .string()
      .trim()
      .min(2, { message: "Kategori usaha wajib diisi." })
      .max(64, { message: "Kategori maksimal 64 karakter." }),
    description: z
      .string()
      .trim()
      .max(1000, { message: "Deskripsi maksimal 1000 karakter." })
      .optional()
      .nullable(),
    address: z
      .string()
      .trim()
      .max(256, { message: "Alamat maksimal 256 karakter." })
      .optional()
      .nullable(),
    location: pointGeometrySchema,
    opening_hours: z.record(z.string(), z.any()).optional().default({}),
    image_url: z
      .string()
      .url({ message: "URL foto usaha harus berformat URL valid." })
      .max(512)
      .optional()
      .nullable(),
  })
  .strict();

export const updateMerchantSubmissionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Nama usaha minimal 2 karakter." })
      .max(128, { message: "Nama usaha maksimal 128 karakter." })
      .optional(),
    category: z
      .string()
      .trim()
      .min(2, { message: "Kategori usaha wajib diisi." })
      .max(64, { message: "Kategori maksimal 64 karakter." })
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, { message: "Deskripsi maksimal 1000 karakter." })
      .optional()
      .nullable(),
    address: z
      .string()
      .trim()
      .max(256, { message: "Alamat maksimal 256 karakter." })
      .optional()
      .nullable(),
    location: pointGeometrySchema.optional(),
    opening_hours: z.record(z.string(), z.any()).optional(),
    image_url: z
      .string()
      .url({ message: "URL foto usaha harus berformat URL valid." })
      .max(512)
      .optional()
      .nullable(),
  })
  .strict();

export const adminApproveSubmissionSchema = z
  .object({
    note: z.string().max(500, { message: "Catatan maksimal 500 karakter." }).optional(),
  })
  .strict();

export const adminRejectSubmissionSchema = z
  .object({
    note: z
      .string()
      .trim()
      .min(3, { message: "Alasan penolakan minimal 3 karakter." })
      .max(500, { message: "Catatan maksimal 500 karakter." }),
  })
  .strict();

export type CreateMerchantSubmissionSchemaType = z.infer<typeof createMerchantSubmissionSchema>;
export type UpdateMerchantSubmissionSchemaType = z.infer<typeof updateMerchantSubmissionSchema>;
export type AdminApproveSubmissionSchemaType = z.infer<typeof adminApproveSubmissionSchema>;
export type AdminRejectSubmissionSchemaType = z.infer<typeof adminRejectSubmissionSchema>;
