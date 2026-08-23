import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().trim().min(3, "Nama terlalu pendek").max(100, "Nama terlalu panjang"),
});
