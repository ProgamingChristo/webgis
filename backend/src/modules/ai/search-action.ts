import { z } from "zod";
import { generateStructured } from "@/lib/ai/provider";
import type { AiAskRequest } from "./ai.schema";

export const SearchCriteriaSchema = z.object({
  query: z.string().trim().min(1).max(120),
  max_budget: z.number().int().min(1000).max(10000000).nullable(),
  open_now: z.boolean(),
  max_walking_minutes: z.number().int().min(5).max(30).nullable(),
  reference_text: z.string().trim().min(2).max(80).nullable(),
  near_user: z.boolean(),
  radius_meters: z.number().int().min(250).max(3000).nullable(),
  sort: z.enum(["RELEVANCE", "NEAREST", "PRICE_ASC"]),
}).strict();

const ExtractionSchema = z.object({
  action: z.enum(["SEARCH", "CHAT", "CLARIFY"]),
  criteria: SearchCriteriaSchema.nullable(),
  clarification: z.string().max(300),
}).strict();

export async function extractSearchAction(request: AiAskRequest) {
  return generateStructured({
    schema: ExtractionSchema, schemaName: "commuter_search_intent", maxTokens: 420,
    instructions: `Extract GETRA merchant search intent. Return CHAT for explanations about a selected place, routes, greetings, or non-search questions. Return SEARCH for finding food/businesses and changes to active search criteria. For follow-ups use current search_context, changing only requested fields. For a new search reset prior constraints. query is only the food/business keyword, no budget/location/request filler. Expand common Indonesian food aliases when unambiguous. reference_text is an explicitly NAMED transit station/stop only, copied from the request; never invent a station or coordinates. For unnamed "dekat stasiun/halte" return CLARIFY asking for its name, rather than picking one. Set near_user for "dekat saya/sekitar sini". radius_meters is the requested radius, or 1000 for near_user/named transit without an explicit radius. If location is an administrative region retain its name in query for the canonical region parser. "Enak" is not evidence; remove taste adjectives from query. Do not return merchant data, taste claims, ratings, scores, distances, prices of merchants, or execution-success claims. If request is ambiguous or unsupported return CLARIFY with a brief Indonesian question. All nullable criteria fields must be explicit null. Default sort RELEVANCE, open_now false, near_user false.`,
    input: JSON.stringify({ question: request.question, search_context: request.context?.search_context ?? null,
      history: request.history?.slice(-4) ?? [] }),
  });
}
