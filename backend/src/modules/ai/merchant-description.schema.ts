import { z } from "zod";

export const merchantDescriptionModes = [
  "generate",
  "improve",
  "engaging",
  "shorten",
  "proofread",
] as const;

const optionalContext = (maximum: number) =>
  z.string().trim().min(1).max(maximum).optional();

export const MerchantDescriptionRequestSchema = z
  .object({
    mode: z.enum(merchantDescriptionModes),
    businessName: optionalContext(120),
    category: optionalContext(100),
    products: optionalContext(500),
    priceRange: optionalContext(100),
    advantages: optionalContext(500),
    description: z.string().trim().max(1_500).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "generate" && !value.products) {
      context.addIssue({
        code: "custom",
        message: "Produk atau layanan unggulan wajib diisi.",
        path: ["products"],
      });
    }

    if (value.mode !== "generate" && value.description.length < 2) {
      context.addIssue({
        code: "custom",
        message: "Deskripsi yang akan diperbaiki belum tersedia.",
        path: ["description"],
      });
    }
  });

export const MerchantDescriptionProviderResponseSchema = z
  .object({
    description: z.string().trim().min(1).max(450),
  })
  .strict();

export type MerchantDescriptionRequest = z.infer<
  typeof MerchantDescriptionRequestSchema
>;

export type MerchantDescriptionMode = MerchantDescriptionRequest["mode"];

export interface MerchantDescriptionResponse {
  description: string;
}
