import { z } from "zod";
import { ApplicationError } from "@/src/lib/errors";

const merchantIdSchema = z.string().uuid();

const intelligenceQuerySchema = z.object({
  merchant_id: merchantIdSchema,
  days: z.coerce.number().int().refine((value) => value === 7 || value === 30).default(30),
}).strict();

export const umkmCopilotRequestSchema = z.object({
  merchant_id: merchantIdSchema,
  days: z.number().int().refine((value) => value === 7 || value === 30).default(30),
  question: z.string().trim().min(3).max(500),
}).strict();

export type UmkmIntelligenceQuery = z.infer<typeof intelligenceQuerySchema>;
export type UmkmCopilotRequest = z.infer<typeof umkmCopilotRequestSchema>;

export function parseUmkmIntelligenceQuery(params: URLSearchParams): UmkmIntelligenceQuery {
  const raw = Object.fromEntries(params.entries());
  const parsed = intelligenceQuerySchema.safeParse(raw);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
