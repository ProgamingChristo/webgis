import { z } from "zod";

export const stakeholderSchema = z.enum([
  "commuter",
  "umkm",
  "investor",
  "government",
]);

export const aiProviderSchema = z.enum(["openai", "claude", "sub2api", "fallback"]);

export const searchIntentSchema = z.object({
  stakeholder: stakeholderSchema.default("commuter"),
  originName: z.string().min(1).default("Stasiun Dukuh Atas"),
  category: z.string().min(1).default("kuliner"),
  maxWalkingMinutes: z.number().int().min(3).max(30).default(10),
  priceLevel: z.enum(["hemat", "menengah", "premium", "semua"]).default("semua"),
  openNow: z.boolean().default(false),
  accessibilityNeeds: z.array(z.enum(["step_free", "guiding_block", "safe_crossing", "well_lit"])).default([]),
  sortBy: z.enum(["best_match", "closest", "accessibility", "opportunity"]).default("best_match"),
});

export const searchRequestSchema = z.object({
  query: z.string().trim().min(3).max(500),
  stakeholder: stakeholderSchema.optional(),
});

export const merchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  coordinates: z.tuple([z.number(), z.number()]),
  walkingMinutes: z.number(),
  distanceMeters: z.number(),
  priceLevel: z.enum(["hemat", "menengah", "premium"]),
  accessibilityScore: z.number().min(0).max(100),
  retailGapScore: z.number().min(0).max(100),
  comfortScore: z.number().min(0).max(100),
  openNow: z.boolean(),
  source: z.string(),
  badges: z.array(z.string()),
  score: z.number(),
  explanation: z.string(),
});

export const searchToolCallSchema = z.object({
  name: z.literal("search_merchants"),
  arguments: searchIntentSchema,
});

export const searchExecutionSchema = z.object({
  intentSource: aiProviderSchema,
  explanationSource: aiProviderSchema,
  dataMode: z.literal("synthetic"),
  tool: searchToolCallSchema.extend({
    adapter: z.literal("demo-merchants"),
    status: z.literal("completed"),
    resultCount: z.number().int().nonnegative(),
  }),
  provenance: z.object({
    dataset: z.literal("GETRA demo merchants"),
    quality: z.literal("synthetic"),
    coverage: z.literal("Klaster demo Dukuh Atas"),
  }),
});

export const searchResponseSchema = z.object({
  intent: searchIntentSchema,
  results: z.array(merchantSchema),
  explanation: z.string().min(1),
  limitations: z.array(z.string()),
  source: aiProviderSchema,
  execution: searchExecutionSchema,
  generatedAt: z.string(),
});

export type Stakeholder = z.infer<typeof stakeholderSchema>;
export type AiProvider = z.infer<typeof aiProviderSchema>;
export type SearchIntent = z.infer<typeof searchIntentSchema>;
export type Merchant = z.infer<typeof merchantSchema>;
export type SearchToolCall = z.infer<typeof searchToolCallSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
