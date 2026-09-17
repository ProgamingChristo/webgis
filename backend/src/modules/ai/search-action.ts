import { z } from "zod";
import { generateStructured } from "@/lib/ai/provider";
import type { AiAskRequest } from "./ai.schema";
import { parseDeterministicCommuterText } from "@/src/features/commuter/commuter-intent";

export const SearchCriteriaSchema = z.object({
  query: z.string().trim().max(120),
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

const SLANG_TYPO_DICTIONARY: Record<string, string> = {
  basko: "bakso",
  ngopi: "kopi",
  dket: "dekat",
  tmpt: "tempat",
  mkn: "makan",
  maknan: "makanan",
  coffee: "kopi",
  find: "cari",
  nearest: "terdekat",
  "open now": "buka sekarang",
  promsoi: "promosi",
  promso: "promosi",
  daftr: "daftar",
  umk: "umkm",
};

export function normalizeSlangAndTypos(text: string): string {
  let normalized = text;
  for (const [typo, fix] of Object.entries(SLANG_TYPO_DICTIONARY)) {
    const reg = new RegExp(`\\b${escapeRegExp(typo)}\\b`, "giu");
    normalized = normalized.replace(reg, fix);
  }
  return normalized;
}

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

const KNOWN_TRANSIT_STATION_PATTERNS = [
  { label: "Stasiun Manggarai", patterns: [/\bstasiun\s+manggarai\b/iu, /\bst\.\s*manggarai\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?manggarai\b/iu] },
  { label: "Stasiun Tanah Abang", patterns: [/\bstasiun\s+tanah\s+abang\b/iu, /\bst\.\s*tanah\s+abang\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?tanah\s+abang\b/iu] },
  { label: "Stasiun Sudirman", patterns: [/\bstasiun\s+sudirman\b/iu, /\bst\.\s*sudirman\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?sudirman\b/iu] },
  { label: "Stasiun Tebet", patterns: [/\bstasiun\s+tebet\b/iu, /\bst\.\s*tebet\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?tebet\b/iu] },
  { label: "Stasiun Gambir", patterns: [/\bstasiun\s+gambir\b/iu, /\bst\.\s*gambir\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?gambir\b/iu] },
  { label: "Stasiun Juanda", patterns: [/\bstasiun\s+juanda\b/iu, /\bst\.\s*juanda\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?juanda\b/iu] },
  { label: "Stasiun Cikini", patterns: [/\bstasiun\s+cikini\b/iu, /\bst\.\s*cikini\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?cikini\b/iu] },
  { label: "Stasiun Gondangdia", patterns: [/\bstasiun\s+gondangdia\b/iu, /\bst\.\s*gondangdia\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?gondangdia\b/iu] },
  { label: "Stasiun Jakarta Kota", patterns: [/\bstasiun\s+jakarta\s+kota\b/iu, /\bst\.\s*jakarta\s+kota\b/iu, /\bstasiun\s+kota\b/iu] },
  { label: "Stasiun Pasar Minggu", patterns: [/\bstasiun\s+pasar\s+minggu\b/iu, /\bst\.\s*pasar\s+minggu\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?pasar\s+minggu\b/iu] },
  { label: "Stasiun Palmerah", patterns: [/\bstasiun\s+palmerah\b/iu, /\bst\.\s*palmerah\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?palmerah\b/iu] },
  { label: "Stasiun Karet", patterns: [/\bstasiun\s+karet\b/iu, /\bst\.\s*karet\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?karet\b/iu] },
  { label: "Stasiun Duren Kalibata", patterns: [/\bstasiun\s+duren\s+kalibata\b/iu, /\bst\.\s*duren\s+kalibata\b/iu, /\bstasiun\s+kalibata\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?kalibata\b/iu] },
  { label: "Stasiun Pasar Senen", patterns: [/\bstasiun\s+pasar\s+senen\b/iu, /\bst\.\s*pasar\s+senen\b/iu, /\bstasiun\s+senen\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?senen\b/iu] },
  { label: "Stasiun Jatinegara", patterns: [/\bstasiun\s+jatinegara\b/iu, /\bst\.\s*jatinegara\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?jatinegara\b/iu] },
  { label: "Stasiun Cakung", patterns: [/\bstasiun\s+cakung\b/iu, /\bst\.\s*cakung\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?cakung\b/iu] },
  { label: "Stasiun Klender", patterns: [/\bstasiun\s+klender\b/iu, /\bst\.\s*klender\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?klender\b/iu] },
  { label: "Stasiun Buaran", patterns: [/\bstasiun\s+buaran\b/iu, /\bst\.\s*buaran\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?buaran\b/iu] },
  { label: "Stasiun Cawang", patterns: [/\bstasiun\s+cawang\b/iu, /\bst\.\s*cawang\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun\s+)?cawang\b/iu] },
  // Landmarks & Key Urban Focal Points
  { label: "Bundaran HI", patterns: [/\bbundaran\s+hi\b/iu, /\bbunderan\s+hi\b/iu, /\bbundaran\s+hotel\s+indonesia\b/iu, /\bmonumen\s+selamat\s+datang\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+bundaran\s+hi\b/iu] },
  { label: "Monas", patterns: [/\bmonas\b/iu, /\bmonumen\s+nasional\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+monas\b/iu] },
  { label: "Sarinah", patterns: [/\bsarinah\b/iu, /\bmall\s+sarinah\b/iu, /\bgedung\s+sarinah\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+sarinah\b/iu] },
  { label: "Gelora Bung Karno", patterns: [/\bgelora\s+bung\s+karno\b/iu, /\bgbk\b/iu, /\bsenayan\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:gbk|gelora\s+bung\s+karno)\b/iu] },
  { label: "Kota Tua", patterns: [/\bkota\s+tua\b/iu, /\bkawasan\s+kota\s+tua\b/iu, /\bmuseum\s+fatahillah\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+kota\s+tua\b/iu] },
  { label: "Blok M", patterns: [/\bblok\s+m\b/iu, /\bkawasan\s+blok\s+m\b/iu, /\bterminal\s+blok\s+m\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+blok\s+m\b/iu] },
  { label: "Dukuh Atas", patterns: [/\bdukuh\s+atas\b/iu, /\btaman\s+dukuh\s+atas\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+dukuh\s+atas\b/iu] },
  { label: "Lapangan Banteng", patterns: [/\blapangan\s+banteng\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+lapangan\s+banteng\b/iu] },
  { label: "Grand Indonesia", patterns: [/\bgrand\s+indonesia\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+grand\s+indonesia\b/iu] },
  { label: "Plaza Indonesia", patterns: [/\bplaza\s+indonesia\b/iu, /\b(?:dekat|sekitar|di dekat|di sekitar)\s+plaza\s+indonesia\b/iu] },
];

function findTransitMention(text: string): { label: string; rawMatch: string } | null {
  for (const station of KNOWN_TRANSIT_STATION_PATTERNS) {
    for (const pat of station.patterns) {
      const m = pat.exec(text);
      if (m) return { label: station.label, rawMatch: m[0] };
    }
  }
  const genericMatch = /\b(?:stasiun|halte)\s+([a-z0-9\s]{3,30})\b/iu.exec(text);
  if (genericMatch) {
    const rawPlace = genericMatch[1].trim();
    if (!/^(dekat|sekitar|di|yang|buka|ini|itu)$/iu.test(rawPlace)) {
      return { label: genericMatch[0].trim(), rawMatch: genericMatch[0] };
    }
  }
  return null;
}

export function extractDeterministicSearchAction(request: AiAskRequest) {
  const normalizedRaw = normalizeSlangAndTypos(request.question);
  const normalized = normalizeRegionText(normalizedRaw);
  if (!normalized) return null;

  // Routing, explanations, and ordinary questions continue through the main
  // AI orchestration path. This fallback only creates executable searches.
  if (
    /\b(rute|route|navigasi|berapa lama|jalan kaki dari|menuju)\b/u.test(normalized)
    || (/^(apa|apakah|bagaimana|kenapa|mengapa|siapa|kapan|cara|gimana|gmn)\b/u.test(normalized) && !/^(?:apa|apakah)\s+ada\b/iu.test(normalized))
    || /\b(cara buat|cara bikin|cara daftar|cara daftarin|cara promosi|cara pasang|cara klaim|cara claim|buat umkm|daftar umkm|bikin umkm|daftr umk|gmn bikin|iklan|iklanin|promosi|promo)\b/u.test(normalized)
    || /\b(aksesibilitas|accessibility|disabilitas|kursi roda|wheelchair)\b/u.test(normalized)
    || /\b(?:stasiun|halte|transit)\b.*\b(?:paling dekat|terdekat|nearest)\b/iu.test(normalized)
    || /\b(?:paling dekat|terdekat|nearest)\b.*\b(?:stasiun|halte|transit)\b/iu.test(normalized)
    || /\b(?:jelaskan|tentang)\s+(?:usaha|toko|merchant|ini)\b/iu.test(normalized)
    || /^(halo|hai|hi|hello|pagi|siang|sore|malam)\b/u.test(normalized)
  ) {
    return null;
  }

  // Check for unnamed transit station/halte query
  const isUnnamedTransit = /\b(?:dekat|sekitar|di dekat|di sekitar)\s+(?:stasiun|halte|terminal)\s*$/iu.test(normalizedRaw)
    || /^(?:cari|temukan)?\s*(?:kuliner|tempat\s+makan|makanan|kopi|umkm)\s+(?:di\s+)?(?:dekat|sekitar)\s+(?:stasiun|halte|terminal)\s*$/iu.test(normalizedRaw);

  if (isUnnamedTransit) {
    return {
      source: "deterministic" as const,
      data: {
        action: "CLARIFY" as const,
        criteria: null,
        clarification: "Sebutkan nama stasiun atau halte yang ingin dicari.",
      },
    };
  }

  let transit = findTransitMention(normalizedRaw);
  let region = findAdministrativeRegionMention(normalizedRaw);

  const searchCtx = request.context?.search_context;
  const lastRefText = (searchCtx as any)?.last_reference_text ?? searchCtx?.reference_text;
  if (!transit && lastRefText) {
    transit = { label: lastRefText, rawMatch: lastRefText };
  } else if (!transit && request.history && request.history.length > 0) {
    const prevText = request.history.map((h) => h.content).join(" ");
    const prevTransit = findTransitMention(prevText);
    if (prevTransit) {
      transit = prevTransit;
    }
  }

  if (!region && request.history && request.history.length > 0) {
    const prevText = request.history.map((h) => h.content).join(" ");
    const prevRegion = findAdministrativeRegionMention(prevText);
    if (prevRegion) {
      region = prevRegion;
    }
  }

  const nearUser = /\b(dekat saya|sekitar saya|di sekitar saya|sekitar sini|dekat sini|terdekat|paling dekat|dket sini)\b/u.test(normalizedRaw);
  const isRadiusExpansion = /\b(perluas|perluasan)\s+(?:radius|jangkauan|area)\b/iu.test(normalizedRaw);
  const parsed = parseDeterministicCommuterText(normalizedRaw);
  const hasConstraint = Boolean(
    parsed.constraints.budget
      || parsed.constraints.opening
      || parsed.constraints.walking,
  );
  const hasFoodOrCategoryCue = /\b(bakso|kopi|coffee|cafe|kafe|makan|warung|mie|nasi|soto|sate|ayam|bebek|seafood|roti|martabak|jus|tea|teh|dimsum|snack|gudeg|padang|pempek|toko|kuliner|restoran|umkm|usaha|pedagang|gerai|outlet)\b/iu.test(normalizedRaw);
  const hasSearchCue = /\b(cari|carikan|temukan|rekomendasikan|rekomendasi|mau makan|tempat makan|tempat ngopi|tmpt ngopi)\b/u.test(normalizedRaw) || hasFoodOrCategoryCue;

  // A short noun phrase such as "bakso di jakarta pusat" is a valid search
  // even without an explicit verb. Long conversational text remains untouched.
  if (!hasSearchCue && !region && !nearUser && !hasConstraint && !transit && !isRadiusExpansion) return null;

  let keyword = parsed.keyword_text
    .replace(/\b(?:tolong\s+)?(?:cari|carikan|temukan|rekomendasikan|rekomendasi)\b/giu, " ")
    .replace(/\b(?:apa|apakah)\s+ada\b/giu, " ")
    .replace(/\b(?:mau|ingin)\s+(?:makan|cari)\b/giu, " ")
    .replace(/\b(?:dekat|di sekitar|sekitar)\s+(?:saya|aku|sini)\b/giu, " ")
    .replace(/\b(?:terdekat|paling dekat)\b/giu, " ");

  if (transit) {
    keyword = keyword.replace(new RegExp(`\\b(?:dekat|sekitar|di dekat|di sekitar)?\\s*${escapeRegExp(transit.rawMatch)}\\b`, "giu"), " ");
    keyword = keyword.replace(new RegExp(`\\b${escapeRegExp(transit.label)}\\b`, "giu"), " ");
  }

  if (region) {
    for (const alias of [...region.aliases, region.canonical]) {
      keyword = keyword.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, "giu"), " ");
    }
  }

  keyword = keyword
    .replace(/\b(?:di|daerah|wilayah|area|dekat|sekitar)\s*$/iu, " ")
    .replace(/\b^(?:di|dekat|sekitar)\s+/iu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If keyword only refers to general domain ("umkm", "toko", "usaha", "tempat")
  // and we have a transit reference or region or nearUser, clean query to broad search
  const isGenericMerchantDiscovery = /^(?:umkm|usaha|toko|tempat|gerai|pedagang)?$/iu.test(keyword);
  let finalQuery = keyword;
  const lastQuery = (searchCtx as any)?.last_query ?? searchCtx?.query;
  const lastRadius = (searchCtx as any)?.last_radius_meters ?? searchCtx?.radius_meters;
  const lastSort = (searchCtx as any)?.last_sort ?? searchCtx?.sort;
  const lastBudget = (searchCtx as any)?.last_max_budget ?? searchCtx?.max_budget;
  const lastOpen = (searchCtx as any)?.last_open_now ?? searchCtx?.open_now;
  const lastWalking = (searchCtx as any)?.last_max_walking_minutes ?? searchCtx?.max_walking_minutes;

  if (isGenericMerchantDiscovery) {
    finalQuery = region ? region.canonical : (lastQuery ?? "");
  } else if (region) {
    finalQuery = `${keyword} ${region.canonical}`.trim();
  }

  const radiusMeters = isRadiusExpansion
    ? 2500
    : (lastRadius ?? ((nearUser || transit) ? 1000 : null));

  const sort = (nearUser || transit || lastSort === "NEAREST") ? "NEAREST" : "RELEVANCE";

  const criteria = SearchCriteriaSchema.parse({
    query: finalQuery,
    max_budget: parsed.constraints.budget?.max_idr ?? lastBudget ?? null,
    open_now: Boolean(parsed.constraints.opening?.open_now ?? lastOpen),
    max_walking_minutes: parsed.constraints.walking?.max_minutes ?? lastWalking ?? null,
    reference_text: transit ? transit.label : null,
    near_user: nearUser,
    radius_meters: radiusMeters,
    sort,
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

