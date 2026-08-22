import { z } from "zod";

export const onboardingSchema = z
  .object({
    modes: z.array(z.enum(["UMKM", "INVESTOR", "GOVERNMENT"])).max(3),
  })
  .strict();

export type OnboardingPayload = z.infer<typeof onboardingSchema>;
