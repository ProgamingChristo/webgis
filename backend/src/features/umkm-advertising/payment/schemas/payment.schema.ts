import { z } from "zod";

export const createCheckoutSchema = z
  .object({
    package_id: z.string().min(1).optional(),
  })
  .strict();

export type CreateCheckoutSchemaType = z.infer<typeof createCheckoutSchema>;
