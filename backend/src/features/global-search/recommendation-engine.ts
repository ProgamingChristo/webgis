import type { CanonicalMerchantMapItem } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

export const RECOMMENDATION_RULESET = Object.freeze({
  version: "commuter-v1",
  weights: { food: 0.4, budget: 0.25, spatial: 0.25, opening: 0.1 },
});

export type RecommendationReason =
  | "FOOD_EXACT_MATCH" | "FOOD_MATCH" | "WITHIN_BUDGET"
  | "NEAR_REFERENCE" | "OPEN_NOW" | "PRICE_UNKNOWN" | "TASTE_EVIDENCE_UNKNOWN";

export interface RecommendationBreakdown {
  score: number;
  coverage: number;
  ruleset: string;
  components: { food: number | null; budget: number | null; spatial: number | null; opening: number | null };
  reasons: RecommendationReason[];
}

export function scoreRecommendation(merchant: CanonicalMerchantMapItem, context: {
  keyword: string | null;
  maxBudget: number | null;
  radiusMeters: number | null;
  openNow: boolean;
}): RecommendationBreakdown {
  const food = context.keyword ? Math.min(1, Math.max(0, (merchant.searchRelevance ?? 0) / 400)) : null;
  const budget = context.maxBudget
    ? merchant.observedPriceAmount === null ? null : Math.min(1, context.maxBudget / Math.max(merchant.observedPriceAmount, context.maxBudget))
    : null;
  const spatial = context.radiusMeters && merchant.referenceDistance
    ? Math.max(0, 1 - merchant.referenceDistance.meters / context.radiusMeters) : null;
  const opening = context.openNow ? merchant.openingStatus === "UNKNOWN" ? null : merchant.openingStatus === "OPEN" ? 1 : 0 : null;
  const components = { food, budget, spatial, opening };
  let availableWeight = 0, weighted = 0;
  for (const key of Object.keys(components) as Array<keyof typeof components>) {
    const value = components[key];
    if (value !== null) { availableWeight += RECOMMENDATION_RULESET.weights[key]; weighted += value * RECOMMENDATION_RULESET.weights[key]; }
  }
  const coverage = availableWeight / Object.values(RECOMMENDATION_RULESET.weights).reduce((sum, value) => sum + value, 0);
  const reasons: RecommendationReason[] = ["TASTE_EVIDENCE_UNKNOWN"];
  if (food === 1) reasons.push("FOOD_EXACT_MATCH"); else if (food !== null && food > 0) reasons.push("FOOD_MATCH");
  if (budget !== null) reasons.push("WITHIN_BUDGET"); else if (context.maxBudget) reasons.push("PRICE_UNKNOWN");
  if (spatial !== null) reasons.push("NEAR_REFERENCE");
  if (opening === 1) reasons.push("OPEN_NOW");
  // Missing values are excluded, then coverage tempers confidence without turning UNKNOWN into zero.
  return { score: availableWeight ? (weighted / availableWeight) * (0.85 + 0.15 * coverage) : 0,
    coverage, ruleset: RECOMMENDATION_RULESET.version, components, reasons };
}

export function rankRecommendations(merchants: CanonicalMerchantMapItem[], context: Parameters<typeof scoreRecommendation>[1]) {
  return merchants.map(merchant => ({ ...merchant, recommendation: scoreRecommendation(merchant, context) }))
    .sort((left, right) => right.recommendation.score - left.recommendation.score || left.id.localeCompare(right.id));
}
