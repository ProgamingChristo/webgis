import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  MerchantCandidateInput,
  MerchantMatchDecision,
} from "./merchant-reconciliation.types";

const PREMIUM_SOURCE_TABLE = "mapid_premium_merchants";
const MENU_GO_SOURCE_TABLE = "mapid_mission_observations:MENU_GO";

export interface CanonicalMerchantResolution {
  merchantId: string;
  created: boolean;
}

export class MerchantReconciliationRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async listCandidateInputs(): Promise<MerchantCandidateInput[]> {
    const { data, error } = await this.supabase.rpc(
      "list_premium_menu_go_candidates_v1",
      { p_radius_meters: 250 },
    );
    if (error) throw error;
    return (data ?? []).map(mapCandidateRow);
  }

  async listPremiumEvidence(): Promise<Array<{
    merchantId: string;
    sourceRecordId: string;
  }>> {
    const { data, error } = await this.supabase
      .from("merchants")
      .select("id,metadata")
      .contains("metadata", { admin_map_import: true })
      .eq("publish_status", "PUBLISHED")
      .range(0, 4_999);
    if (error) throw error;

    return (data ?? [])
      .filter((row: any) => row.metadata?.source_type === "PUBLIC_API_URL")
      .map((row: any) => ({
        merchantId: row.id,
        sourceRecordId: String(row.metadata?.source_record_id || row.id),
      }));
  }

  async getSourceIds() {
    const { data, error } = await this.supabase
      .from("spatial_sources")
      .select("id,source_code")
      .in("source_code", ["mapid_premium_merchants", "mapid_menu_go_observations"]);
    if (error) throw error;
    const byCode = new Map((data ?? []).map((row: any) => [row.source_code, row.id]));
    const premium = byCode.get("mapid_premium_merchants");
    const menuGo = byCode.get("mapid_menu_go_observations");
    if (!premium || !menuGo) throw new Error("RECONCILIATION_SPATIAL_SOURCES_MISSING");
    return { premium, menuGo };
  }

  async linkPremiumEvidence(
    sourceId: string,
    evidence: Array<{ merchantId: string; sourceRecordId: string }>,
  ) {
    if (evidence.length === 0) return 0;
    const now = new Date().toISOString();
    const rows = evidence.map((item) => ({
      confidence: 1,
      evidence_type: "PREMIUM_POI_EVIDENCE",
      first_seen_at: now,
      last_seen_at: now,
      merchant_id: item.merchantId,
      metadata: { provider: "MAPID", source_semantics: "PREMIUM_POI_EVIDENCE" },
      source_id: sourceId,
      source_record_id: item.sourceRecordId,
      source_table: PREMIUM_SOURCE_TABLE,
    }));

    for (let offset = 0; offset < rows.length; offset += 250) {
      const { error } = await this.supabase.from("merchant_source_links").upsert(
        rows.slice(offset, offset + 250),
        { onConflict: "source_table,source_record_id" },
      );
      if (error) throw error;
    }
    return rows.length;
  }

  async resolveMenuCanonical(
    decision: MerchantMatchDecision,
  ): Promise<CanonicalMerchantResolution> {
    if (
      (decision.status === "MATCH_CONFIRMED" ||
        decision.status === "MATCH_HIGH_CONFIDENCE") &&
      decision.candidate.premiumMerchantId
    ) {
      return { merchantId: decision.candidate.premiumMerchantId, created: false };
    }

    const slug = menuGoSlug(decision.candidate.menuSourceRecordId);
    const { data: existing, error: existingError } = await this.supabase
      .from("merchants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { merchantId: existing.id, created: false };

    const name = decision.candidate.menuName?.trim();
    if (!name) throw new Error("MENU_GO_NAME_REQUIRED_FOR_CANONICAL_MERCHANT");
    const properties = decision.candidate.menuProperties;
    const { data, error } = await this.supabase
      .from("merchants")
      .insert({
        address: null,
        description: decision.candidate.menuCategory,
        is_mobile: decision.isMobile,
        location: `SRID=4326;POINT(${decision.candidate.menuLongitude} ${decision.candidate.menuLatitude})`,
        metadata: {
          attribute_provenance: {
            category: "MENU_GO",
            geometry: "MENU_GO_OBSERVED_LOCATION",
            name: "MENU_GO",
            observations: "MENU_GO",
          },
          menu_go_observation: {
            foto_menu_1: properties.foto_menu_1 ?? null,
            foto_menu_2: properties.foto_menu_2 ?? null,
            foto_tempat: properties.foto_tempat ?? null,
            harga_rata_rata: properties.harga_rata_rata ?? null,
            kondisi_tempat: properties.kondisi_tempat ?? null,
            menu_utama: properties.menu_utama ?? null,
            mobilitas: properties.mobilitas ?? null,
            observed_at: decision.candidate.menuObservedAt,
          },
          source_record_id: decision.candidate.menuSourceRecordId,
          source_type: "MENU_GO",
        },
        name,
        opening_hours: {},
        publish_status: "PUBLISHED",
        slug,
        verification_status: "SURVEYED",
      })
      .select("id")
      .single();
    if (error || !data) throw error || new Error("MENU_GO_CANONICAL_CREATE_FAILED");
    return { merchantId: data.id, created: true };
  }

  async persistDecision(
    decision: MerchantMatchDecision,
    resolvedMerchantId: string,
    menuGoSourceId: string,
  ) {
    const now = new Date().toISOString();
    const candidate = decision.candidate;
    const { error: linkError } = await this.supabase
      .from("merchant_source_links")
      .upsert({
        confidence: decision.score,
        evidence_type: "FIELD_SURVEY_MERCHANT_OBSERVATION",
        first_seen_at: candidate.menuObservedAt ?? now,
        last_seen_at: now,
        merchant_id: resolvedMerchantId,
        metadata: {
          algorithm_version: "merchant-reconciliation-v1",
          geometry_semantics: decision.isMobile
            ? "OBSERVED_MOBILE_LOCATION"
            : "OBSERVED_LOCATION",
          match_status: decision.status,
          observed_at: candidate.menuObservedAt,
          source_semantics: "FIELD_SURVEY_MERCHANT_OBSERVATION",
        },
        source_id: menuGoSourceId,
        source_record_id: candidate.menuSourceRecordId,
        source_table: MENU_GO_SOURCE_TABLE,
      }, { onConflict: "source_table,source_record_id" });
    if (linkError) throw linkError;

    const { error: decisionError } = await this.supabase
      .from("merchant_reconciliation_decisions")
      .upsert({
        address_match: decision.addressMatch,
        algorithm_version: "merchant-reconciliation-v1",
        category_match: decision.categoryMatch,
        decision_reason: decision.reason,
        distance_meters: candidate.distanceMeters,
        evidence: {
          menu_go_source_record_id: candidate.menuSourceRecordId,
          premium_source_record_id: candidate.premiumSourceRecordId,
          thresholds_meters: { confirmed: 50, high_confidence: 20, review: 120 },
          weights: { category: 0.1, distance: 0.25, identity_bonus: 0.05, name: 0.6 },
        },
        match_score: decision.score,
        match_status: decision.status,
        menu_go_mobile: decision.isMobile,
        menu_observation_id: candidate.menuObservationId,
        name_score: decision.nameScore,
        phone_match: decision.phoneMatch,
        premium_merchant_id: candidate.premiumMerchantId,
        resolved_merchant_id: resolvedMerchantId,
      }, { onConflict: "menu_observation_id" });
    if (decisionError) throw decisionError;
  }

  async getSummary() {
    const { data, error } = await this.supabase
      .from("merchant_reconciliation_decisions")
      .select("match_status,updated_at")
      .range(0, 4_999);
    if (error) throw error;
    const counts = { confirmed: 0, high_confidence: 0, review_required: 0, no_match: 0 };
    for (const row of data ?? []) {
      if (row.match_status === "MATCH_CONFIRMED") counts.confirmed += 1;
      if (row.match_status === "MATCH_HIGH_CONFIDENCE") counts.high_confidence += 1;
      if (row.match_status === "MATCH_REVIEW_REQUIRED") counts.review_required += 1;
      if (row.match_status === "NO_MATCH") counts.no_match += 1;
    }
    return {
      ...counts,
      total: data?.length ?? 0,
      last_reconciled_at: (data ?? []).map((row: any) => row.updated_at).sort().at(-1) ?? null,
    };
  }
}

function menuGoSlug(sourceRecordId: string) {
  const digest = createHash("sha256").update(sourceRecordId).digest("hex").slice(0, 24);
  return `menu-go-${digest}`;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapCandidateRow(row: any): MerchantCandidateInput {
  return {
    distanceMeters: optionalNumber(row.distance_meters),
    menuCategory: optionalString(row.menu_category),
    menuLatitude: Number(row.menu_latitude),
    menuLongitude: Number(row.menu_longitude),
    menuMobility: optionalString(row.menu_mobility),
    menuName: optionalString(row.menu_name),
    menuObservationId: row.menu_observation_id,
    menuObservedAt: optionalString(row.menu_observed_at),
    menuProperties: asObject(row.menu_properties),
    menuSourceRecordId: row.menu_source_record_id,
    premiumAddress: optionalString(row.premium_address),
    premiumCategory: optionalString(row.premium_category),
    premiumLatitude: optionalNumber(row.premium_latitude),
    premiumLongitude: optionalNumber(row.premium_longitude),
    premiumMerchantId: optionalString(row.premium_merchant_id),
    premiumMetadata: asObject(row.premium_metadata),
    premiumName: optionalString(row.premium_name),
    premiumPhone: optionalString(row.premium_phone),
    premiumSourceRecordId: optionalString(row.premium_source_record_id),
  };
}

