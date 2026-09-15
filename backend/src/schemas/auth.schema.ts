import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  isCommonPassword,
} from "@/src/lib/password-policy";

export const registerSchema = z
  .object({
    email: z
      .string()
      .email("Format email tidak valid.")
      .max(254),

    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`)
      .max(MAX_PASSWORD_LENGTH)
      .refine((val) => !isCommonPassword(val), {
        message: "Password terlalu mudah ditebak.",
      }),

    display_name: z
      .string()
      .min(2, "Nama minimal 2 karakter.")
      .max(50, "Nama maksimal 50 karakter."),
  })
  .strict();

export type RegisterRequest = z.infer<
  typeof registerSchema
>;

export const loginSchema = z
  .object({
    email: z
      .string()
      .email("Format email tidak valid.")
      .max(254),

    password: z
      .string()
      .min(1, "Password tidak boleh kosong.")
      .max(128),
  })
  .strict();

export type LoginRequest = z.infer<
  typeof loginSchema
>;