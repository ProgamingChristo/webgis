import { z } from "zod";

export const merchantOwnershipQuerySchema = z.object({
  merchantId: z.string().uuid(),
});

export const createClaimSchema = z.object({
  merchantId: z.string().uuid(),
  evidence: z.record(z.string(), z.any()).optional(),
  note: z.string().optional(),
});
