import { z } from "zod";

export const registerSchema = z
  .object({
    email: z
      .string()
      .email("Format email tidak valid.")
      .max(254),

    password: z
      .string()
      .min(8, "Password minimal 8 karakter.")
      .max(128),

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