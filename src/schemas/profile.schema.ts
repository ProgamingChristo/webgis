import { z } from "zod";

export const patchProfileSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name must be less than 50 characters").optional(),
  avatar_url: z.string().url("Invalid avatar URL").optional().nullable(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided to update",
});

export type PatchProfileRequest = z.infer<typeof patchProfileSchema>;
