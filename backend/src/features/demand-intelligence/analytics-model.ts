import { ANALYTICS_WEIGHTS } from "./analytics.constants";
import type { EvidenceConfidence } from "./analytics.types";

export interface DemandCounts {
  search_events: number;
  route_requests: number;
  commuter_requests: number;
  transaction_observations: number;
}

export function weightedDemand(counts: DemandCounts) {
  return counts.search_events * ANALYTICS_WEIGHTS.SEARCH
    + counts.route_requests * ANALYTICS_WEIGHTS.ROUTE_REQUEST
    + counts.commuter_requests * ANALYTICS_WEIGHTS.COMMUTER_REQUEST
    + counts.transaction_observations * ANALYTICS_WEIGHTS.TRANSACTION_OBSERVATION;
}

export function relativeLogScore(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(100 * Math.log1p(value) / Math.log1p(maximum))));
}

export function retailGap(demandScore: number, supplyScore: number, sampleSize: number) {
  return sampleSize < 3 ? null : Math.max(-100, Math.min(100, demandScore - supplyScore));
}

export function evidenceConfidence(sampleSize: number, sourceDiversity: number): EvidenceConfidence {
  if (sampleSize < 3) return "INSUFFICIENT_DATA";
  if (sampleSize < 10 || sourceDiversity < 2) return "LIMITED_EVIDENCE";
  if (sampleSize >= 30 && sourceDiversity >= 3) return "STRONGER_EVIDENCE";
  return "MODERATE_EVIDENCE";
}
