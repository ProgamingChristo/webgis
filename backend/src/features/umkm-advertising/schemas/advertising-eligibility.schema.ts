import { z } from "zod";

export const advertisingEligibilityQuerySchema = z.object({
  merchantId: z.string().uuid(),
});
