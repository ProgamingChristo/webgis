import type { SearchIntent, Merchant } from "@/lib/contracts/search";
import { DEMO_MERCHANTS } from "@/lib/data/demo";

const priceMatch = (requested: SearchIntent["priceLevel"], actual: string) =>
  requested === "semua" || requested === actual;

export function rankDemoMerchants(intent: SearchIntent): Merchant[] {
  const normalizedCategory = intent.category.toLowerCase();

  return DEMO_MERCHANTS
    .filter((merchant) => {
      const categoryMatches =
        normalizedCategory === "semua" ||
        normalizedCategory === "retail" ||
        normalizedCategory === "kuliner"
          ? ["kuliner", "kopi"].includes(merchant.category)
          : merchant.category.includes(normalizedCategory);

      return (
        categoryMatches &&
        merchant.walkingMinutes <= intent.maxWalkingMinutes &&
        priceMatch(intent.priceLevel, merchant.priceLevel) &&
        (!intent.openNow || merchant.openNow)
      );
    })
    .map((merchant) => {
      const timeScore = Math.max(0, 100 - merchant.walkingMinutes * 5);
      const priceBonus = priceMatch(intent.priceLevel, merchant.priceLevel) ? 8 : 0;
      const accessibilityWeight = intent.accessibilityNeeds.length > 0 ? 0.42 : 0.3;
      const opportunityWeight = intent.stakeholder === "investor" || intent.stakeholder === "umkm" ? 0.34 : 0.18;
      const score =
        timeScore * (1 - accessibilityWeight - opportunityWeight) +
        merchant.accessibilityScore * accessibilityWeight +
        merchant.retailGapScore * opportunityWeight +
        priceBonus;

      return {
        ...merchant,
        score: Math.round(Math.min(100, score)),
        explanation: `${merchant.walkingMinutes} menit berjalan, akses ${merchant.accessibilityScore}/100, dan retail gap ${merchant.retailGapScore}/100.`,
      };
    })
    .sort((a, b) => {
      if (intent.sortBy === "closest") return a.walkingMinutes - b.walkingMinutes;
      if (intent.sortBy === "accessibility") return b.accessibilityScore - a.accessibilityScore;
      if (intent.sortBy === "opportunity") return b.retailGapScore - a.retailGapScore;
      return b.score - a.score;
    });
}
