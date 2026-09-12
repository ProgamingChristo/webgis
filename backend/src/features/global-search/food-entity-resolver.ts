const FOOD_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  baso: "bakso",
  nasgor: "nasi goreng",
  "mi goreng": "mie goreng",
  gultik: "gulai tikungan",
});

/**
 * Versioned vocabulary normalization. Unknown dishes remain searchable text,
 * so new foods work without adding a conditional branch to business logic.
 */
export const FOOD_VOCABULARY_VERSION = "2026-09-11";

export function resolveFoodEntity(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ").trim();
  return FOOD_ALIASES[normalized] ?? (normalized || null);
}
