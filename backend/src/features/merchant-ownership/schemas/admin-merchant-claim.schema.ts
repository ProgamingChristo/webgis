import { z } from "zod";

export const adminApproveMerchantClaimSchema = z
  .object({
    note: z.string().trim().max(500, { message: "Catatan maksimal 500 karakter." }).optional(),
  })
  .strict();

export const adminRejectMerchantClaimSchema = z
  .object({
    note: z
      .string()
      .trim()
      .min(3, { message: "Alasan penolakan minimal 3 karakter." })
      .max(500, { message: "Catatan maksimal 500 karakter." }),
  })
  .strict();

export type AdminApproveMerchantClaimInput = z.infer<typeof adminApproveMerchantClaimSchema>;
export type AdminRejectMerchantClaimInput = z.infer<typeof adminRejectMerchantClaimSchema>;
