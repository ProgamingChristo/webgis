export type EntityQueryKind = "DISCOVERY" | "ENTITY" | "PLACE";

export type EntityCandidate<T> = {
  value: T;
  label: string;
  score: number;
};

export type EntityResolution<T> =
  | { status: "RESOLVED"; candidate: EntityCandidate<T> }
  | { status: "AMBIGUOUS"; candidates: EntityCandidate<T>[] }
  | { status: "NOT_FOUND"; candidates: EntityCandidate<T>[] };

const LEADING_FILLERS = /^(?:(?:tolong\s+)?(?:cari(?:kan)?|temukan|tampilkan|lihat|buka|fokus(?:kan)?|rute|arah|navigasi|menuju|ke|dari|lokasi|tempat)(?:\s+(?:yang|ke|menuju|bernama|namanya))?\s+)+/u;
const DISCOVERY_WORDS = new Set(["cari", "sekitar", "dekat", "terdekat", "rekomendasi", "murah", "enak", "buka"]);
const GENERIC_ENTITY_WORDS = new Set(["pt", "cv", "toko", "warung", "kedai", "restoran", "rumah", "makan", "cafe", "kafe"]);
const PLACE_PREFIXES = new Set([
  "jalan", "jl", "gang", "gg", "perumahan", "kompleks", "cluster", "apartemen",
  "gedung", "kampus", "mall", "mal", "rumah sakit", "rs", "sekolah", "stasiun",
  "halte", "terminal", "bandara", "pelabuhan", "taman", "kecamatan", "kelurahan",
]);

export function normalizeEntityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function stripEntityFillers(value: string): string {
  return normalizeEntityText(value).replace(LEADING_FILLERS, "").trim();
}

export function classifyEntityQuery(value: string): EntityQueryKind {
  const normalized = normalizeEntityText(value);
  const stripped = stripEntityFillers(value);
  if (!stripped || /\b(?:apa saja|di sekitar|dekat sini|yang enak|yang murah)\b/u.test(normalized)) return "DISCOVERY";
  if ([...PLACE_PREFIXES].some((prefix) => stripped === prefix || stripped.startsWith(`${prefix} `))) return "PLACE";
  const tokens = stripped.split(" ");
  if (tokens.length <= 2 && tokens.every((token) => DISCOVERY_WORDS.has(token))) return "DISCOVERY";
  return "ENTITY";
}

export function entityRetrievalTerms(value: string): string[] {
  const tokens = stripEntityFillers(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !DISCOVERY_WORDS.has(token) && !GENERIC_ENTITY_WORDS.has(token));
  return [...new Set(tokens)].sort((left, right) => right.length - left.length).slice(0, 3);
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function tokenSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length >= 3 && (left.includes(right) || right.includes(left))) return 0.9;
  const phonetic = (value: string) => value.replace(/ks/g, "x").replace(/i$/u, "y");
  const distance = Math.min(editDistance(left, right), editDistance(phonetic(left), phonetic(right)));
  return 1 - distance / Math.max(left.length, right.length, 1);
}

export function entityMatchScore(query: string, label: string): number {
  const normalizedQuery = stripEntityFillers(query);
  const normalizedLabel = normalizeEntityText(label);
  if (!normalizedQuery || !normalizedLabel) return 0;
  if (normalizedQuery === normalizedLabel) return 1;
  if (normalizedLabel.startsWith(normalizedQuery)) return 0.96;
  if (normalizedLabel.includes(normalizedQuery)) return 0.93;

  const queryTokens = normalizedQuery.split(" ").filter((token) => !GENERIC_ENTITY_WORDS.has(token));
  const labelTokens = normalizedLabel.split(" ").filter((token) => !GENERIC_ENTITY_WORDS.has(token));
  if (!queryTokens.length || !labelTokens.length) return 0;
  const tokenScores = queryTokens.map((queryToken) =>
    Math.max(...labelTokens.map((labelToken) => tokenSimilarity(queryToken, labelToken))),
  );
  const coverage = tokenScores.filter((score) => score >= 0.72).length / queryTokens.length;
  const average = tokenScores.reduce((sum, score) => sum + score, 0) / queryTokens.length;
  const orderBonus = normalizedLabel.includes(queryTokens.join(" ")) ? 0.05 : 0;
  return Math.min(0.92, coverage * 0.55 + average * 0.4 + orderBonus);
}

export function rankEntityMatches<T>(query: string, values: T[], labelFor: (value: T) => string): EntityCandidate<T>[] {
  return values
    .map((value) => ({ value, label: labelFor(value), score: entityMatchScore(query, labelFor(value)) }))
    .filter((candidate) => candidate.score >= 0.68)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, "id"));
}

export function resolveEntityCandidates<T>(query: string, values: T[], labelFor: (value: T) => string): EntityResolution<T> {
  const candidates = rankEntityMatches(query, values, labelFor);
  const top = candidates[0];
  if (!top || top.score < 0.72) return { status: "NOT_FOUND", candidates };
  const competitors = candidates.filter((candidate) => candidate.score >= top.score - 0.04);
  if (competitors.length > 1 && top.score < 0.98) return { status: "AMBIGUOUS", candidates: competitors.slice(0, 3) };
  return { status: "RESOLVED", candidate: top };
}
