import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NavigationRouteCandidate,
  NavigationRouteResult,
  RoutePreference,
} from "./routing.types";

export const ROUTE_UMKM_POLICY = {
  corridorMeters: 150,
  maximumDurationRatio: 1.35,
  maximumDistanceRatio: 1.35,
  maximumCandidates: 3,
} as const;

type CorridorRow = {
  nearby_umkm_count?: number;
  verified_umkm_count?: number;
  distinct_category_count?: number;
};

export class RouteUmkmAnalysisService {
  constructor(private readonly client: SupabaseClient) {}

  async enrich(
    result: NavigationRouteResult,
    preference: RoutePreference,
  ): Promise<NavigationRouteResult> {
    if (result.route_status !== "ROUTABLE") return result;
    const source = result.route_candidates?.length
      ? result.route_candidates.slice(0, ROUTE_UMKM_POLICY.maximumCandidates)
      : [candidateFromResult(result)];
    try {
      const candidates = await Promise.all(source.map((candidate) => this.enrichCandidate(candidate)));
      return selectCandidate(result, candidates, preference);
    } catch {
      return {
        ...result,
        route_candidates: source,
        route_preference: preference,
        selected_route_id: source[0]?.route_id ?? null,
        umkm_preference_available: false,
        umkm_enrichment_status: "UNAVAILABLE",
        warnings: [...result.warnings, "Data UMKM rute belum tersedia."],
      };
    }
  }

  private async enrichCandidate(candidate: NavigationRouteCandidate) {
    const { data, error } = await (this.client as any).rpc("analyze_route_umkm_corridor_v1", {
      p_route_geojson: candidate.geometry,
      p_corridor_meters: ROUTE_UMKM_POLICY.corridorMeters,
    }).single();
    if (error) throw error;
    const row = (data ?? {}) as CorridorRow;
    return {
      ...candidate,
      nearby_umkm_count: nonNegative(row.nearby_umkm_count),
      verified_umkm_count: nonNegative(row.verified_umkm_count),
      distinct_category_count: nonNegative(row.distinct_category_count),
    };
  }
}

function candidateFromResult(result: NavigationRouteResult): NavigationRouteCandidate {
  return {
    distance_meters: result.distance_meters!, duration_seconds: result.duration_seconds!,
    geometry: result.geometry!, has_ferry: result.has_ferry, has_highway: result.has_highway,
    has_toll: result.has_toll, is_primary: true, maneuvers: result.maneuvers, mode: result.mode,
    nearby_umkm_count: null, route_category: "FASTEST", route_id: "route-0", route_rank: 0,
    verified_umkm_count: null, distinct_category_count: null,
  };
}

export function selectCandidate(
  result: NavigationRouteResult,
  candidates: NavigationRouteCandidate[],
  preference: RoutePreference,
): NavigationRouteResult {
  const fastest = [...candidates].sort((a, b) => a.duration_seconds - b.duration_seconds)[0];
  const bounded = candidates.filter((candidate) =>
    candidate.duration_seconds <= fastest.duration_seconds * ROUTE_UMKM_POLICY.maximumDurationRatio &&
    candidate.distance_meters <= fastest.distance_meters * ROUTE_UMKM_POLICY.maximumDistanceRatio);
  const richer = [...bounded].filter((candidate) => candidate.route_id !== fastest.route_id &&
    (candidate.nearby_umkm_count ?? 0) > (fastest.nearby_umkm_count ?? 0))
    .sort((a, b) => (b.nearby_umkm_count ?? 0) - (a.nearby_umkm_count ?? 0) || a.duration_seconds - b.duration_seconds)[0];
  const selected = preference === "UMKM" && richer ? richer : fastest;
  const normalized = candidates.map((candidate) => ({
    ...candidate,
    is_primary: candidate.route_id === fastest.route_id,
    route_category: candidate.route_id === fastest.route_id ? "FASTEST" as const
      : candidate.route_id === richer?.route_id ? "UMKM_AREA" as const : "ALTERNATIVE" as const,
  }));
  return {
    ...result,
    ...candidateResultFields(selected),
    route_candidates: normalized,
    route_preference: preference,
    selected_route_id: selected.route_id,
    umkm_preference_available: Boolean(richer),
    umkm_enrichment_status: "AVAILABLE",
  };
}

function candidateResultFields(candidate: NavigationRouteCandidate) {
  return {
    distance_meters: candidate.distance_meters, duration_seconds: candidate.duration_seconds,
    geometry: candidate.geometry, has_ferry: candidate.has_ferry, has_highway: candidate.has_highway,
    has_toll: candidate.has_toll, maneuvers: candidate.maneuvers,
  };
}

function nonNegative(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}
