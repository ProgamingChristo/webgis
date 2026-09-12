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

const AiRouteModeSchema = z.enum(["walking", "motorcycle", "car"]);

export const AiAskRequestSchema = z.object({
  question: z.string().min(2).max(1000),
  active_experience: z.enum(["GENERAL", "UMKM", "INVESTOR", "GOVERNMENT"]).default("GENERAL"),
  context: z.object({
    study_area_id: z.string().optional(),
    selected_entity_id: z.string().optional(),
    selected_entity_name: z.string().trim().max(160).optional(),
    origin: z.object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    }).optional(),
    destination: z.object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    }).optional(),
    active_route: z.object({
      mode: AiRouteModeSchema,
      distance_meters: z.number().finite().positive(),
      duration_seconds: z.number().finite().positive(),
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

const AiOriginSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CURRENT_LOCATION") }),
  z.object({ type: z.literal("PLACE_QUERY"), query: z.string().trim().min(2).max(120) }),
  z.object({
    type: z.literal("MAP_POINT"),
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
  }),
]);
const AiDestinationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SELECTED_MERCHANT") }),
  z.object({ type: z.literal("MERCHANT_ID"), merchant_id: z.string().uuid() }),
  z.object({ type: z.literal("PLACE_QUERY"), query: z.string().trim().min(2).max(120) }),
]);

export const AiApplicationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ANSWER_ONLY") }),
  z.object({ type: z.literal("APPLY_SEARCH_CRITERIA"), query: z.string().trim().min(2).max(120) }),
  z.object({
    type: z.literal("CALCULATE_ROUTE"),
    mode: AiRouteModeSchema,
    origin: AiOriginSchema,
    destination: AiDestinationSchema,
  }),
  z.object({ type: z.literal("CHANGE_ROUTE_MODE"), mode: AiRouteModeSchema }),
  z.object({ type: z.literal("FOCUS_PLACE"), query: z.string().trim().min(2).max(120) }),
  z.object({ type: z.literal("REQUEST_CLARIFICATION"), prompt: z.string().trim().min(2).max(240) }),
]);
export type AiApplicationAction = z.infer<typeof AiApplicationActionSchema>;

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
  action: AiApplicationActionSchema.optional(),
  provider: z.enum(["openai", "sub2api", "deterministic"]),
});
export type AiAskResponse = z.infer<typeof AiAskResponseSchema>;

// Classification Schema used by the LLM to pick an intent
export const IntentClassificationSchema = z.object({
  intent: AiIntentEnum,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  action: AiApplicationActionSchema.optional(),
});
export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

// Grounded Generation Schema used by the LLM
export const GroundedGenerationSchema = z.object({
  answer: z.string(),
  limitations_mentioned: z.array(z.string()),
});
export type GroundedGeneration = z.infer<typeof GroundedGenerationSchema>;
