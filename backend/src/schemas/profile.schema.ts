import { z } from "zod";

const trimmedOptionalString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length > 0 ? value : null))
    .optional()
    .nullable();

export const patchProfileSchema = z.object({
  display_name: z.string().trim().min(2, "Display name must be at least 2 characters").max(50, "Display name must be less than 50 characters").optional(),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, "Username can only use lowercase letters, numbers, and underscores").optional().nullable(),
  avatar_url: z.string().trim().url("Invalid avatar URL").optional().nullable(),
  phone_number: trimmedOptionalString(32),
  bio: trimmedOptionalString(240),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided to update",
});

export const publicProfileListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
}).strict();

export type PatchProfileRequest = z.infer<typeof patchProfileSchema>;
export type PublicProfileListQuery = z.infer<typeof publicProfileListQuerySchema>;
