import type { CommuterConstraints } from "@/src/features/commuter/commuter.types";

const WALKING_PATTERNS = [
  /(?:maksimal|max(?:imum)?|paling lama)?\s*(\d{1,2})\s*menit\s*(?:jalan kaki|berjalan kaki)/i,
  /(?:jalan kaki|berjalan kaki|dijangkau)\s*(?:maksimal|max(?:imum)?|dalam)?\s*(\d{1,2})\s*menit/i,
];

const BUDGET_PATTERNS = [
  /(?:di\s*bawah|dibawah|maksimal|max(?:imum)?|budget|harga)\s*(?:rp\.?\s*)?(\d[\d.]*)\s*(ribu(?:an)?|rb|k)?/i,
  /\brp\.?\s*(\d[\d.]*)\s*(ribu(?:an)?|rb|k)?\b/i,
  /\b(\d[\d.]*)\s*(ribu(?:an)?|rb|k)\b/i,
];
const OPEN_NOW_PATTERN = /\b(?:yang\s+)?buka\s+sekarang\b/i;

export interface ParsedCommuterText {
  keyword_text: string;
  constraints: CommuterConstraints;
  confidence: "HIGH" | "MEDIUM";
}

export function parseDeterministicCommuterText(input: string): ParsedCommuterText {
  let keywordText = input.trim();
  let maxWalkingMinutes: number | null = null;

  for (const pattern of WALKING_PATTERNS) {
    const match = pattern.exec(keywordText);
    if (!match?.[1]) continue;
    const parsed = Number(match[1]);
    if (parsed >= 5 && parsed <= 30) maxWalkingMinutes = parsed;
    keywordText = keywordText.replace(match[0], " ");
    break;
  }

  const budgetMatch = BUDGET_PATTERNS
    .map((pattern) => pattern.exec(keywordText))
    .find(Boolean);
  const maxBudget = budgetMatch?.[1]
    ? normalizeIdrAmount(budgetMatch[1], budgetMatch[2])
    : null;
  if (budgetMatch) keywordText = keywordText.replace(budgetMatch[0], " ");

  const openNow = OPEN_NOW_PATTERN.test(keywordText);
  keywordText = keywordText.replace(OPEN_NOW_PATTERN, " ");
  keywordText = keywordText
    .replace(/\b(?:makan|tempat\s+makan|yang|dan|dengan|jalan\s+kaki)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    keyword_text: keywordText,
    constraints: {
      budget: maxBudget === null ? null : { max_idr: maxBudget },
      opening: openNow ? { open_now: true, timezone: "Asia/Jakarta" } : null,
      walking: maxWalkingMinutes === null ? null : { max_minutes: maxWalkingMinutes },
    },
    confidence: "HIGH",
  };
}

export function normalizeIdrAmount(digits: string, suffix?: string): number | null {
  const numeric = Number(digits.replace(/\./g, ""));
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return null;
  const normalizedSuffix = suffix?.toLowerCase().replace(/an$/, "");
  const amount = ["ribu", "rb", "k"].includes(normalizedSuffix ?? "")
    ? numeric * 1_000
    : numeric;
  return amount >= 1_000 && amount <= 10_000_000 ? amount : null;
}

export function parseObservedPrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(/rp\.?/g, "").trim();
  const match = /(\d[\d.]*)\s*(ribu|rb|k)?/.exec(normalized);
  return match?.[1] ? normalizeIdrAmount(match[1], match[2]) : null;
}
