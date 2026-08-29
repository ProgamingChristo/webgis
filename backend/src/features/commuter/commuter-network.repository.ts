import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_GRAPH_SNAP_METERS } from "@/src/features/commuter/commuter.schema";
import type {
  CommuterOrigin,
  WalkingCandidateEvidence,
  WalkingCandidateInput,
} from "@/src/features/commuter/commuter.types";

export class CommuterNetworkRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async walkingCosts(origin: CommuterOrigin, candidates: WalkingCandidateInput[]) {
    const { data, error } = await this.supabase.rpc("calculate_walking_costs_v1", {
      p_origin_longitude: origin.longitude,
      p_origin_latitude: origin.latitude,
      p_candidates: candidates,
      p_max_snap_meters: MAX_GRAPH_SNAP_METERS,
      p_environment: "PRODUCTION",
    });
    if (error) throw error;
    const payload = asObject(data);
    return {
      status: String(payload.status ?? "ERROR"),
      candidates: Array.isArray(payload.candidates)
        ? payload.candidates.map(mapWalkingEvidence)
        : [],
    };
  }

  async route(origin: CommuterOrigin, destination: { longitude: number; latitude: number }) {
    const { data, error } = await this.supabase.rpc("calculate_walking_route_v2", {
      p_origin_longitude: origin.longitude,
      p_origin_latitude: origin.latitude,
      p_destination_longitude: destination.longitude,
      p_destination_latitude: destination.latitude,
      p_max_snap_meters: MAX_GRAPH_SNAP_METERS,
      p_environment: "PRODUCTION",
    });
    if (error) throw error;
    return asObject(data);
  }

  async serviceArea(origin: CommuterOrigin, maxMinutes: number) {
    const { data, error } = await this.supabase.rpc("calculate_walking_service_area_v1", {
      p_origin_longitude: origin.longitude,
      p_origin_latitude: origin.latitude,
      p_max_minutes: maxMinutes,
      p_max_snap_meters: MAX_GRAPH_SNAP_METERS,
      p_environment: "PRODUCTION",
    });
    if (error) throw error;
    return asObject(data);
  }

  async graphHealth() {
    const { data, error } = await this.supabase.rpc("get_pedestrian_graph_health_v1", {
      p_environment: "PRODUCTION",
    });
    if (error) throw error;
    return asObject(data);
  }
}

function mapWalkingEvidence(value: unknown): WalkingCandidateEvidence {
  const row = asObject(value);
  return {
    candidate_id: String(row.candidate_id ?? ""),
    status: row.status === "ROUTABLE" || row.status === "UNROUTABLE"
      ? row.status
      : "NO_NETWORK_ACCESS",
    network_distance_meters: nullableNumber(row.network_distance_meters),
    access_distance_meters: nullableNumber(row.access_distance_meters),
    distance_meters: nullableNumber(row.distance_meters),
    duration_seconds: nullableNumber(row.duration_seconds),
    destination_node_id: nullableNumber(row.destination_node_id),
  };
}

function nullableNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asObject(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}
