import { z } from "zod";
import { generateStructured } from "@/lib/ai/provider";
import type { AiAskRequest } from "./ai.schema";
import { parseDeterministicCommuterText } from "@/src/features/commuter/commuter-intent";

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

const ADMIN_REGION_HINTS = [
  { canonical: "Jakarta Barat", aliases: ["jakarta barat", "jakbar"] },
  { canonical: "Jakarta Pusat", aliases: ["jakarta pusat", "jakpus"] },
  { canonical: "Jakarta Selatan", aliases: ["jakarta selatan", "jaksel"] },
  { canonical: "Jakarta Timur", aliases: ["jakarta timur", "jaktim"] },
  { canonical: "Jakarta Utara", aliases: ["jakarta utara", "jakut"] },
] as const;

function normalizeRegionText(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findAdministrativeRegionMention(value: string) {
  const normalized = normalizeRegionText(value);
  return ADMIN_REGION_HINTS.find((region) =>
    region.aliases.some((alias) => {
      const normalizedAlias = normalizeRegionText(alias);
      return normalized === normalizedAlias
        || normalized.startsWith(`${normalizedAlias} `)
        || normalized.endsWith(` ${normalizedAlias}`)
        || normalized.includes(` ${normalizedAlias} `);
    }),
  ) ?? null;
}

function ensureRegionInCriteriaQuery(
  requestQuestion: string,
  criteria: z.infer<typeof SearchCriteriaSchema>,
) {
  const region = findAdministrativeRegionMention(requestQuestion);
  if (!region) return criteria;

  const normalizedQuery = normalizeRegionText(criteria.query);
  const alreadyContainsRegion = region.aliases.some((alias) => {
    const normalizedAlias = normalizeRegionText(alias);
    return normalizedQuery === normalizedAlias
      || normalizedQuery.startsWith(`${normalizedAlias} `)
      || normalizedQuery.endsWith(` ${normalizedAlias}`)
      || normalizedQuery.includes(` ${normalizedAlias} `);
  }) || normalizedQuery.includes(normalizeRegionText(region.canonical));

  if (alreadyContainsRegion) return criteria;

  const enriched = {
    ...criteria,
    query: `${criteria.query} ${region.canonical}`.trim().slice(0, 120),
  };
  const parsed = SearchCriteriaSchema.safeParse(enriched);
  return parsed.success ? parsed.data : criteria;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDeterministicSearchAction(request: AiAskRequest) {
  const normalized = normalizeRegionText(request.question);
  if (!normalized) return null;

  // Routing, explanations, and ordinary questions continue through the main
  // AI orchestration path. This fallback only creates executable searches.
  if (
    /\b(rute|route|navigasi|berapa lama|jalan kaki dari|menuju)\b/u.test(normalized)
    || /^(apa|apakah|bagaimana|kenapa|mengapa|siapa|kapan)\b/u.test(normalized)
    || /^(halo|hai|hi|hello|pagi|siang|sore|malam)\b/u.test(normalized)
  ) {
    return null;
  }

  const region = findAdministrativeRegionMention(request.question);
  const nearUser = /\b(dekat saya|sekitar saya|di sekitar saya|sekitar sini|dekat sini)\b/u.test(normalized);
  const parsed = parseDeterministicCommuterText(request.question);
  const hasConstraint = Boolean(
    parsed.constraints.budget
      || parsed.constraints.opening
      || parsed.constraints.walking,
  );
  const hasSearchCue = /\b(cari|carikan|temukan|rekomendasikan|rekomendasi|mau makan|tempat makan)\b/u.test(normalized);

  // A short noun phrase such as "bakso di jakarta pusat" is a valid search
  // even without an explicit verb. Long conversational text remains untouched.
  if (!hasSearchCue && !region && !nearUser && !hasConstraint) return null;

  let keyword = parsed.keyword_text
    .replace(/\b(?:tolong\s+)?(?:cari|carikan|temukan|rekomendasikan|rekomendasi)\b/giu, " ")
    .replace(/\b(?:mau|ingin)\s+(?:makan|cari)\b/giu, " ")
    .replace(/\b(?:dekat|di sekitar|sekitar)\s+(?:saya|aku|sini)\b/giu, " ");

  if (region) {
    for (const alias of [...region.aliases, region.canonical]) {
      keyword = keyword.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, "giu"), " ");
    }
  }

  keyword = keyword
    .replace(/\b(?:di|daerah|wilayah|area)\s*$/iu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!keyword) return null;

  const criteria = SearchCriteriaSchema.parse({
    query: region ? `${keyword} ${region.canonical}` : keyword,
    max_budget: parsed.constraints.budget?.max_idr ?? null,
    open_now: Boolean(parsed.constraints.opening?.open_now),
    max_walking_minutes: parsed.constraints.walking?.max_minutes ?? null,
    reference_text: null,
    near_user: nearUser,
    radius_meters: nearUser ? 1000 : null,
    sort: nearUser ? "NEAREST" : "RELEVANCE",
  });

  return {
    source: "deterministic" as const,
    data: { action: "SEARCH" as const, criteria, clarification: "" },
  };
}

export async function extractSearchAction(request: AiAskRequest) {
  let result;
  try {
    result = await generateStructured({
      schema: ExtractionSchema, schemaName: "commuter_search_intent", maxTokens: 420,
      instructions: `Extract GETRA merchant search intent. Return CHAT for explanations about a selected place, routes, greetings, or non-search questions. Return SEARCH for finding food/businesses and changes to active search criteria. For follow-ups use current search_context, changing only requested fields. For a new search reset prior constraints. query is only the food/business keyword, no budget/location/request filler. Expand common Indonesian food aliases when unambiguous. reference_text is an explicitly NAMED transit station/stop only, copied from the request; never invent a station or coordinates. For unnamed "dekat stasiun/halte" return CLARIFY asking for its name, rather than picking one. Set near_user for "dekat saya/sekitar sini". radius_meters is the requested radius, or 1000 for near_user/named transit without an explicit radius. If location is an administrative region retain its name in query for the canonical region parser. "Enak" is not evidence; remove taste adjectives from query. Do not return merchant data, taste claims, ratings, scores, distances, prices of merchants, or execution-success claims. If request is ambiguous or unsupported return CLARIFY with a brief Indonesian question. All nullable criteria fields must be explicit null. Default sort RELEVANCE, open_now false, near_user false.`,
      input: JSON.stringify({ question: request.question, search_context: request.context?.search_context ?? null,
        history: request.history?.slice(-4) ?? [] }),
    });
  } catch (error) {
    const deterministic = extractDeterministicSearchAction(request);
    if (deterministic) return deterministic;
    throw error;
  }

  if (!result) {
    return extractDeterministicSearchAction(request);
  }

  if (result.data.action !== "SEARCH" || !result.data.criteria) {
    return result;
  }

  return {
    ...result,
    data: {
      ...result.data,
      criteria: ensureRegionInCriteriaQuery(request.question, result.data.criteria),
    },
  };
}

