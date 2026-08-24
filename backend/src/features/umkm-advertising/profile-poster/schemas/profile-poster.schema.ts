import { z } from "zod";

export const profilePosterQuerySchema = z.object({
  merchant_id: z
    .string()
    .uuid({ message: "Merchant ID harus format UUID valid." }),
});

export type ProfilePosterQuerySchemaType = z.infer<typeof profilePosterQuerySchema>;
