import { z } from "zod";

export const AiIntentEnum = z.enum([
  "ASSISTANT_IDENTITY",
  "CASUAL_CHAT",
  "GENERAL_AREA",
  "NEAREST_TRANSIT",
  "WALKING_ROUTE",
  "UMKM_POI",
  "UNKNOWN",
]);
export type AiIntent = z.infer<typeof AiIntentEnum>;

export const AiAskRequestSchema = z.object({
  question: z.string().min(2).max(1000),
  active_experience: z.enum(["GENERAL", "UMKM", "INVESTOR", "GOVERNMENT"]).default("GENERAL"),
  context: z.object({
    study_area_id: z.string().optional(),
    selected_entity_id: z.string().optional(),
    origin: z.object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    }).optional(),
    destination: z.object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    }).optional(),
  }).optional(),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(1000),
    })
  ).max(10).optional(),
});
export type AiAskRequest = z.infer<typeof AiAskRequestSchema>;

export const AiProvenanceSchema = z.object({
  source: z.string(),
  dataset: z.string(),
  description: z.string().optional(),
});
export type AiProvenance = z.infer<typeof AiProvenanceSchema>;

export const AiMapActionSchema = z.object({
  type: z.literal("FOCUS_ENTITY"),
  entity_type: z.enum(["TRANSPORT_NODE", "UMKM"]),
  entity_id: z.string(),
  label: z.string().optional(),
});
export type AiMapAction = z.infer<typeof AiMapActionSchema>;

export const AiFactBaseSchema = z.object({
  intent: AiIntentEnum,
  limitations: z.array(z.string()).default([]),
  provenance: z.array(AiProvenanceSchema).default([]),
});

export const TransitFactsSchema = AiFactBaseSchema.extend({
  intent: z.literal("NEAREST_TRANSIT"),
  facts: z.object({
    stop_name: z.string().nullable(),
    distance_m: z.number().nullable(),
    corridor: z.string().nullable(),
    accessibility_status: z.enum(["AVAILABLE", "INSUFFICIENT", "UNKNOWN"]).default("UNKNOWN"),
  }),
});
export type TransitFacts = z.infer<typeof TransitFactsSchema>;

export const RouteFactsSchema = AiFactBaseSchema.extend({
  intent: z.literal("WALKING_ROUTE"),
  facts: z.object({
    distance_m: z.number().nullable(),
    duration_s: z.number().nullable(),
    status: z.enum(["FOUND", "NO_ROUTE", "ERROR"]),
  }),
});
export type RouteFacts = z.infer<typeof RouteFactsSchema>;

export const AreaFactsSchema = AiFactBaseSchema.extend({
  intent: z.literal("GENERAL_AREA"),
  facts: z.object({
    area_name: z.string().nullable(),
    umkm_count: z.number().default(0),
    transit_count: z.number().default(0),
    community_activity_summary: z.string().nullable(),
  }),
});
export type AreaFacts = z.infer<typeof AreaFactsSchema>;

export const UmkmFactsSchema = AiFactBaseSchema.extend({
  intent: z.literal("UMKM_POI"),
  facts: z.object({
    merchant_name: z.string(),
    category: z.string().nullable(),
    status: z.string().nullable(),
    price_evidence_available: z.boolean(),
  }),
});
export type UmkmFacts = z.infer<typeof UmkmFactsSchema>;

export const AiAskResponseSchema = z.object({
  answer: z.string(),
  intent: AiIntentEnum,
  limitations: z.array(z.string()),
  evidence: z.array(AiProvenanceSchema),
  map_action: AiMapActionSchema.optional(),
  provider: z.enum(["sub2api", "deterministic"]),
});
export type AiAskResponse = z.infer<typeof AiAskResponseSchema>;

// Classification Schema used by the LLM to pick an intent
export const IntentClassificationSchema = z.object({
  intent: AiIntentEnum,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

// Grounded Generation Schema used by the LLM
export const GroundedGenerationSchema = z.object({
  answer: z.string(),
  limitations_mentioned: z.array(z.string()),
});
export type GroundedGeneration = z.infer<typeof GroundedGenerationSchema>;
