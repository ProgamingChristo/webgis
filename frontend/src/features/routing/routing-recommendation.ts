import type { RoutingMode, RoutingResult } from "@/src/services/routing.service";

export interface RoutingRecommendationContext {
  originNearTransit?: boolean;
  pedestrianAccessibilityScore?: number | null;
}

export function recommendRoutingMode(
  routes: Partial<Record<RoutingMode, RoutingResult>>,
  context: RoutingRecommendationContext = {},
): RoutingMode | null {
  const scores = (Object.entries(routes) as Array<[RoutingMode, RoutingResult]>)
    .filter(([, route]) => route.route_status === "ROUTABLE" && route.distance_meters && route.duration_seconds)
    .map(([mode, route]) => ({ mode, score: scoreRoute(mode, route, context) }))
    .sort((a, b) => a.score - b.score || modeOrder(a.mode) - modeOrder(b.mode));
  return scores[0]?.mode ?? null;
}

function scoreRoute(
  mode: RoutingMode,
  route: RoutingResult,
  context: RoutingRecommendationContext,
) {
  const minutes = (route.duration_seconds ?? Number.MAX_SAFE_INTEGER) / 60;
  const kilometers = (route.distance_meters ?? Number.MAX_SAFE_INTEGER) / 1_000;

  if (mode === "walking") {
    let score = minutes + kilometers * 1.5;
    if (minutes <= 20) score -= 7;
    if (minutes > 45) score += 25 + (minutes - 45) * 0.4;
    if (context.originNearTransit) score -= 3;
    if ((context.pedestrianAccessibilityScore ?? 0) >= 70) score -= 2;
    if ((context.pedestrianAccessibilityScore ?? 100) < 40) score += 6;
    return score;
  }

  if (mode === "motorcycle") {
    let score = minutes + kilometers * 0.12 + 2;
    if (kilometers >= 2) score -= 2;
    if (route.has_toll) score += 4;
    return score;
  }

  let score = minutes + kilometers * 0.08 + 4;
  if (kilometers >= 15) score -= 2;
  if (context.originNearTransit && kilometers < 3) score += 3;
  return score;
}

function modeOrder(mode: RoutingMode) {
  return mode === "walking" ? 0 : mode === "motorcycle" ? 1 : 2;
}
