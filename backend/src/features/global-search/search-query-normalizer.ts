const SEARCH_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  baso: "bakso",
  gultik: "gulai tikungan",
  "mi goreng": "mie goreng",
  nasgor: "nasi goreng",
});

const CANONICAL_FOOD_TERMS = Object.freeze([
  "bakso",
  "gudeg",
  "ketoprak",
  "mie goreng",
  "nasi goreng",
  "nasi kucing",
  "nasi padang",
  "rawon",
  "rendang",
  "sate",
  "seblak",
  "soto",
  "soto mie",
]);

export interface SearchQueryResolution {
  raw: string;
  normalized: string;
  canonical: string;
  correction: string | null;
  confidence: "EXACT" | "ALIAS" | "HIGH_FUZZY" | "NONE";
}

export function normalizeQueryText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveSearchQuery(value: string): SearchQueryResolution {
  const normalized = normalizeQueryText(value);
  const alias = SEARCH_ALIASES[normalized];
  if (alias) {
    return { raw: value, normalized, canonical: alias, correction: alias, confidence: "ALIAS" };
  }
  if (!normalized || CANONICAL_FOOD_TERMS.includes(normalized)) {
    return { raw: value, normalized, canonical: normalized, correction: null, confidence: "EXACT" };
  }

  const candidates = CANONICAL_FOOD_TERMS
    .map((candidate) => ({ candidate, distance: damerauLevenshtein(normalized, candidate) }))
    .sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate, "id"));
  const best = candidates[0];
  const runnerUp = candidates[1];
  const maximumDistance = normalized.length >= 8 ? 2 : 1;
  if (best && best.distance <= maximumDistance && (!runnerUp || runnerUp.distance > best.distance)) {
    return {
      raw: value,
      normalized,
      canonical: best.candidate,
      correction: best.candidate,
      confidence: "HIGH_FUZZY",
    };
  }

  return { raw: value, normalized, canonical: normalized, correction: null, confidence: "NONE" };
}

function damerauLevenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
      if (
        row > 1 && column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + 1);
      }
    }
  }
  return matrix[left.length][right.length];
}

