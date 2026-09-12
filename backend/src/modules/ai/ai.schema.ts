import { z } from "zod";
import { SearchCriteriaSchema } from "./search-action";

export const AiIntentEnum = z.enum([
  "ASSISTANT_IDENTITY",
  "CASUAL_CHAT",
  "GENERAL_AREA",
  "NEAREST_TRANSIT",
  "WALKING_ROUTE",
  "UMKM_POI",
  "MERCHANT_SEARCH",
  "UNKNOWN",
]);

export type AiIntent = z.infer<typeof AiIntentEnum>;

const AiRouteModeSchema = z.enum(["walking", "motorcycle", "car"]);

export const AiAskRequestSchema = z.object({
  question: z.string().min(2).max(1000),

  active_experience: z
    .enum(["GENERAL", "UMKM", "INVESTOR", "GOVERNMENT"])
    .default("GENERAL"),

  context: z
    .object({
      enable_search: z.boolean().optional(),

      search_context: SearchCriteriaSchema.optional(),

      study_area_id: z.string().optional(),

      selected_entity_id: z.string().optional(),

      selected_entity_name: z.string().trim().max(160).optional(),

      origin: z
        .object({
          latitude: z.number().finite().min(-90).max(90),
          longitude: z.number().finite().min(-180).max(180),
        })
        .optional(),

      destination: z
        .object({
          latitude: z.number().finite().min(-90).max(90),
          longitude: z.number().finite().min(-180).max(180),
        })
        .optional(),

      active_route: z
        .object({
          mode: AiRouteModeSchema,
          distance_meters: z.number().finite().positive(),
          duration_seconds: z.number().finite().positive(),
        })
        .optional(),
    })
    .optional(),

  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1000),
      })
    )
    .max(10)
    .optional(),
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
  z.object({
    type: z.literal("CURRENT_LOCATION"),
  }),

  z.object({
    type: z.literal("PLACE_QUERY"),
    query: z.string().trim().min(2).max(120),
  }),

  z.object({
    type: z.literal("MAP_POINT"),
    longitude: z.number().finite().min(-180).max(180),
    latitude: z.number().finite().min(-90).max(90),
  }),
]);

const AiDestinationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SELECTED_MERCHANT"),
  }),

  z.object({
    type: z.literal("MERCHANT_ID"),
    merchant_id: z.string().uuid(),
  }),

  z.object({
    type: z.literal("PLACE_QUERY"),
    query: z.string().trim().min(2).max(120),
  }),
]);

/**
 * Canonical application action returned by Tanya GETRA.
 *
 * Important architecture rule:
 * - AI understands intent and prepares structured application actions.
 * - GETRA backend / GIS executes search, spatial analysis, and routing.
 * - AI must not fabricate route distance, walking time, service area,
 *   accessibility score, retail gap, revenue, ROI, or other GIS/business metrics.
 */
export const AiApplicationActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ANSWER_ONLY"),
  }),

  /**
   * Apply structured GETRA merchant/search criteria.
   *
   * SearchCriteriaSchema remains the source of truth so AI-generated
   * searches use the same contract as the GETRA search system.
   */
  z.object({
    type: z.literal("APPLY_SEARCH_CRITERIA"),
    criteria: SearchCriteriaSchema,
  }),

  /**
   * Request GETRA routing engine to calculate a route.
   *
   * The AI only determines user intent/origin/destination/mode.
   * Actual route geometry, distance, and duration must be calculated
   * by GETRA routing/GIS services.
   */
  z.object({
    type: z.literal("CALCULATE_ROUTE"),
    mode: AiRouteModeSchema,
    origin: AiOriginSchema,
    destination: AiDestinationSchema,
  }),

  /**
   * Change the currently active route transportation mode.
   * GETRA must recalculate the route using the routing engine.
   */
  z.object({
    type: z.literal("CHANGE_ROUTE_MODE"),
    mode: AiRouteModeSchema,
  }),

  /**
   * Ask GETRA to resolve/focus a place on the map.
   */
  z.object({
    type: z.literal("FOCUS_PLACE"),
    query: z.string().trim().min(2).max(120),
  }),

  /**
   * Used when the user's request is not sufficiently specific
   * to safely execute an application action.
   */
  z.object({
    type: z.literal("REQUEST_CLARIFICATION"),
    prompt: z.string().trim().min(2).max(240),
  }),
]);

export type AiApplicationAction = z.infer<
  typeof AiApplicationActionSchema
>;

export const AiFactBaseSchema = z.object({
  intent: AiIntentEnum,
  limitations: z.array(z.string()).default([]),
  provenance: z.array(AiProvenanceSchema).default([]),
});

export const TransitFactsSchema = AiFactBaseSchema.extend({
  intent: z.literal("NEAREST_TRANSIT"),

  facts: z.object({
    stop_name: z.string().nullable(),

    /**
     * Must come from authoritative GIS/spatial computation.
     * The AI must not calculate this value independently.
     */
    distance_m: z.number().nullable(),

    corridor: z.string().nullable(),

    accessibility_status: z
      .enum(["AVAILABLE", "INSUFFICIENT", "UNKNOWN"])
      .default("UNKNOWN"),
  }),
});

export type TransitFacts = z.infer<typeof TransitFactsSchema>;

export const RouteFactsSchema = AiFactBaseSchema.extend({
  intent: z.literal("WALKING_ROUTE"),

  facts: z.object({
    /**
     * Grounded output from GETRA routing engine.
     */
    distance_m: z.number().nullable(),

    /**
     * Grounded output from GETRA routing engine.
     */
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

    /**
     * Indicates whether actual grounded price evidence exists.
     * This must not imply or fabricate a numeric merchant price.
     */
    price_evidence_available: z.boolean(),
  }),
});

export type UmkmFacts = z.infer<typeof UmkmFactsSchema>;

/**
 * Canonical Tanya GETRA response contract.
 *
 * IMPORTANT:
 * `search_action` is intentionally removed.
 *
 * All executable application behavior is represented through the
 * unified `action` field using AiApplicationActionSchema.
 *
 * This avoids having separate action authorities for:
 * - search
 * - routing
 * - map focus
 * - clarification
 */
export const AiAskResponseSchema = z.object({
  answer: z.string(),

  intent: AiIntentEnum,

  limitations: z.array(z.string()),

  evidence: z.array(AiProvenanceSchema),

  /**
   * Legacy/specialized entity-focus action.
   *
   * Kept for compatibility with existing map entity focus behavior.
   */
  map_action: AiMapActionSchema.optional(),

  /**
   * Canonical application action.
   *
   * Examples:
   * - APPLY_SEARCH_CRITERIA
   * - CALCULATE_ROUTE
   * - CHANGE_ROUTE_MODE
   * - FOCUS_PLACE
   * - REQUEST_CLARIFICATION
   * - ANSWER_ONLY
   */
  action: AiApplicationActionSchema.optional(),

  provider: z.enum(["openai", "sub2api", "deterministic"]),
});

export type AiAskResponse = z.infer<typeof AiAskResponseSchema>;

/**
 * Classification schema used by the LLM to determine:
 * - user intent
 * - classification confidence
 * - appropriate GETRA application action
 *
 * The action is still validated by AiApplicationActionSchema,
 * so the LLM cannot return arbitrary application commands.
 */
export const IntentClassificationSchema = z.object({
  intent: AiIntentEnum,

  confidence: z.number().min(0).max(1),

  reasoning: z.string(),

  action: AiApplicationActionSchema.optional(),
});

export type IntentClassification = z.infer<
  typeof IntentClassificationSchema
>;

/**
 * Grounded answer generation schema.
 *
 * The LLM receives already-computed facts and explains them.
 * It must not replace GETRA GIS/routing/spatial computation.
 */
export const GroundedGenerationSchema = z.object({
  answer: z.string(),

  limitations_mentioned: z.array(z.string()),
});

export type GroundedGeneration = z.infer<
  typeof GroundedGenerationSchema
>;