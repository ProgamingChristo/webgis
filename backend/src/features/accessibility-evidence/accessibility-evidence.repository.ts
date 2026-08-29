import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AccessibilityEvidenceDetailDTO,
  AccessibilityEvidenceDTO,
  AccessibilityEvidenceResult,
  AccessibilityNeedSummary,
} from "@/src/features/accessibility-evidence/accessibility-evidence.types";
import type {
  AccessibilityEvidenceQuery,
  AccessibilityNeedQuery,
  AccessibilityReviewRequest,
} from "@/src/features/accessibility-evidence/accessibility-evidence.schema";

export class AccessibilityEvidenceRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async list(query: AccessibilityEvidenceQuery): Promise<AccessibilityEvidenceResult> {
    const { data, error } = await this.supabase.rpc(
      "list_accessibility_evidence_v1",
      {
        p_category: query.category ?? null,
        p_days: query.days ?? null,
        p_limit: query.limit,
        p_max_lat: query.north,
        p_max_lng: query.east,
        p_min_lat: query.south,
        p_min_lng: query.west,
        p_offset: query.offset,
        p_source_type: query.source_type ?? null,
        p_validation_status: query.validation_status ?? null,
      },
    );
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const evidence = rows.map(mapEvidenceRow);
    const total = Number(rows[0]?.total_count ?? 0);
    const hasMore = query.offset + rows.length < total;

    return {
      bbox: {
        west: query.west,
        south: query.south,
        east: query.east,
        north: query.north,
      },
      evidence,
      has_more: hasMore,
      limit: query.limit,
      next_offset: hasMore ? query.offset + rows.length : null,
      offset: query.offset,
      total_available: total,
    };
  }

  async getDetail(evidenceId: string): Promise<AccessibilityEvidenceDetailDTO | null> {
    const { data, error } = await this.supabase.rpc(
      "get_accessibility_evidence_detail_v1",
      {
        p_evidence_id: evidenceId,
        p_max_distance_m: 40,
      },
    );
    if (error) throw error;
    return data ? mapEvidenceDetail(data) : null;
  }

  async need(query: AccessibilityNeedQuery): Promise<AccessibilityNeedSummary> {
    const { data, error } = await this.supabase.rpc(
      "get_accessibility_need_summary_v1",
      {
        p_category: query.category ?? null,
        p_days: query.days ?? null,
        p_max_lat: query.north,
        p_max_lng: query.east,
        p_min_lat: query.south,
        p_min_lng: query.west,
        p_source_type: query.source_type ?? null,
        p_validation_status: query.validation_status ?? null,
      },
    );
    if (error) throw error;
    return mapNeedSummary(data);
  }

  async review(
    evidenceId: string,
    input: AccessibilityReviewRequest,
  ): Promise<AccessibilityEvidenceDetailDTO> {
    const { data, error } = await this.supabase.rpc(
      "review_accessibility_evidence_v1",
      {
        p_candidate_network_feature_id: input.candidate_network_feature_id ?? null,
        p_confirmed_category: input.confirmed_category ?? null,
        p_confirmed_subcategory: input.confirmed_subcategory ?? null,
        p_evidence_id: evidenceId,
        p_relation_status: input.relation_status,
        p_review_reason: input.review_reason ?? null,
        p_validation_status: input.validation_status,
      },
    );
    if (error) throw error;
    return mapEvidenceDetail(data);
  }
}

function mapEvidenceRow(row: any): AccessibilityEvidenceDTO {
  return {
    id: String(row.id),
    source_type: row.source_type,
    source_record_id: String(row.source_record_id),
    geometry: mapPoint(row.geometry),
    category: row.category,
    suggested_category: row.suggested_category,
    subcategory: row.subcategory,
    title: stringOrNull(row.title),
    description: stringOrNull(row.description),
    media_urls: safeMediaUrls(row.media_urls),
    observed_at: stringOrNull(row.observed_at),
    freshness_status: row.freshness_status,
    validation_status: row.validation_status,
    relation_status: row.relation_status,
    routing_effect_enabled: false,
  };
}

function mapEvidenceDetail(row: any): AccessibilityEvidenceDetailDTO {
  const base = mapEvidenceRow(row);
  const relation = asObject(row.spatial_relation);
  return {
    ...base,
    spatial_relation: relation
      ? {
          network_feature_type: "PEDESTRIAN_EDGE",
          network_feature_id: String(relation.network_feature_id),
          distance_m: Number(relation.distance_m ?? 0),
          relation_status: relation.relation_status,
          routing_effect_enabled: false,
        }
      : null,
  };
}

function mapNeedSummary(value: any): AccessibilityNeedSummary {
  const row = asObject(value) ?? {};
  return {
    aggregation_unit: "VIEWPORT",
    sample_size: numberValue(row.sample_size),
    observation_count: numberValue(row.observation_count),
    confirmed_count: numberValue(row.confirmed_count),
    needs_review_count: numberValue(row.needs_review_count),
    observed_count: numberValue(row.observed_count),
    recent_count: numberValue(row.recent_count),
    low_sample: Boolean(row.low_sample),
    category_breakdown: numberRecord(row.category_breakdown),
    validation_breakdown: numberRecord(row.validation_breakdown),
    freshness_breakdown: numberRecord(row.freshness_breakdown),
    model: {
      name: "ACCESSIBILITY_EVIDENCE_COUNTS_V1",
      score: null,
      limitations: Array.isArray(row.model?.limitations)
        ? row.model.limitations.map(String)
        : [
            "Accessibility Need is based on observed or reviewed evidence counts.",
            "Phase 12 evidence does not modify routing costs.",
          ],
    },
  };
}

function mapPoint(value: unknown) {
  const object = asObject(value);
  const coordinates = Array.isArray(object?.coordinates)
    ? object.coordinates
    : [0, 0];
  return {
    type: "Point" as const,
    coordinates: [
      Number(coordinates[0] ?? 0),
      Number(coordinates[1] ?? 0),
    ] as [number, number],
  };
}

function safeMediaUrls(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [];
  return values
    .map((item) => typeof item === "string" ? item.trim() : "")
    .filter((item) => item.startsWith("https://"))
    .slice(0, 4);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function numberRecord(value: unknown): Record<string, number> {
  const object = asObject(value) ?? {};
  return Object.fromEntries(
    Object.entries(object).map(([key, count]) => [key, numberValue(count)]),
  );
}

function asObject(value: unknown): Record<string, any> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}
