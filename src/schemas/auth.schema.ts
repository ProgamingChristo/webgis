import { z } from "zod";

export const UserRoleEnum = z.enum(["COMMUTER", "UMKM", "COMMUNITY", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const registerSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  display_name: z.string().min(2, "Nama minimal 2 karakter.").max(50, "Nama maksimal 50 karakter."),
  role: UserRoleEnum.optional().default("COMMUTER"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(1, "Password tidak boleh kosong."),
});

export type LoginRequest = z.infer<typeof loginSchema>;
