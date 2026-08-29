import { ANALYTICS_CATEGORY_SLUGS } from "./analytics.constants";
import type { AnalyticsCategorySlug } from "./analytics.types";

const CATEGORY_PATTERNS: ReadonlyArray<[AnalyticsCategorySlug, RegExp]> = [
  ["bakso", /\bbakso\b/i],
  ["nasi-goreng", /nasi[\s_-]*goreng/i],
  ["coffee", /kopi|coffee|kafe|cafe/i],
  ["minimarket", /minimarket|supermarket|indomaret|alfamart|family\s*mart|circle\s*k|lawson/i],
  ["pharmacy", /apotek|pharmacy/i],
  ["fast-food", /fast[\s_-]*food|\bkfc\b|mcdonald/i],
  ["street-food", /kaki[\s_-]*lima|gerobak|street[\s_-]*food/i],
  ["warung", /warung|tenda/i],
  ["restaurant", /restoran|restaurant/i],
  ["beverage", /minuman|beverage/i],
  ["food", /roti|kue|pastri|donat|makanan|food/i],
  ["retail", /retail|e-commerce/i],
  ["laundry", /laundry/i],
  ["services", /jasa|service/i],
];

export function resolveAnalyticsCategory(text: string | null | undefined): AnalyticsCategorySlug | null {
  const normalized = text?.trim();
  if (!normalized) return null;
  const exact = ANALYTICS_CATEGORY_SLUGS.find((slug) => slug === normalized.toLowerCase());
  if (exact) return exact;
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}
