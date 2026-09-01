import { z } from "zod";

export const merchantOwnershipQuerySchema = z.object({
  merchantId: z.string().uuid(),
});

export const createClaimSchema = z.object({
  merchantId: z.string().uuid(),
  evidence: z
    .object({
      contactName: z.string().trim().min(2).max(120),
      contactPhone: z.string().trim().min(8).max(32),
      relationship: z.enum(["OWNER", "MANAGER", "AUTHORIZED_REPRESENTATIVE"]),
      statement: z.string().trim().min(20).max(1_000),
    })
    .strict(),
  note: z.string().trim().max(500).optional(),
});
