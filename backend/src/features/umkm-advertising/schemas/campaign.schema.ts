import { z } from "zod";

export const createCampaignSchema = z.object({
  merchantId: z.string().uuid(),
  name: z.string().trim().min(3, "Name is too short").max(100, "Name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(3, "Name is too short").max(100, "Name is too long").optional(),
  description: z.string().trim().max(500, "Description is too long").optional(),
});
