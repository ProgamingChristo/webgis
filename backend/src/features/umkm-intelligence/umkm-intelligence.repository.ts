import type { SupabaseClient } from "@supabase/supabase-js";
import { CanonicalMerchantReadService } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";
import { DemandIntelligenceRepository } from "@/src/features/demand-intelligence";
import { CommuterNetworkRepository } from "@/src/features/commuter";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { MAX_SIMILAR_MERCHANTS, TRANSIT_SEARCH_RADIUS_METERS } from "./umkm-intelligence.constants";

const MERCHANT_COLUMNS = "id,name,address,description,location,opening_hours,price_level,metadata,is_mobile,verification_status,publish_status,updated_at,owner_id,primary_category_id";

export class UmkmIntelligenceRepository {
  readonly demand: DemandIntelligenceRepository;
  readonly network: CommuterNetworkRepository;

  constructor(private readonly supabase: SupabaseClient<any>) {
    this.demand = new DemandIntelligenceRepository(supabase);
    this.network = new CommuterNetworkRepository(supabase);
  }

  async getMerchant(merchantId: string) {
    const { data, error } = await this.supabase
      .from("merchants")
      .select(MERCHANT_COLUMNS)
      .eq("id", merchantId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getAccountRole(userId: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("account_role")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.account_role ?? "USER";
  }

  async hasApprovedClaim(userId: string, merchantId: string) {
    const { count, error } = await this.supabase
      .from("merchant_claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("merchant_id", merchantId)
      .eq("status", "APPROVED");
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async getSourceEvidence(merchantId: string) {
    const { data: links, error } = await this.supabase
      .from("merchant_source_links")
      .select("source_table,source_record_id")
      .eq("merchant_id", merchantId)
      .limit(20);
    if (error) throw error;
    const menuIds = (links ?? [])
      .filter((link: any) => link.source_table === "mapid_mission_observations:MENU_GO")
      .map((link: any) => link.source_record_id);
    if (menuIds.length === 0) return { links: links ?? [], observations: [] };
    const { data: observations, error: observationError } = await this.supabase
      .from("mapid_mission_observations")
      .select("source_record_id,normalized_properties,observed_at,imported_at,verification_status")
      .eq("source_type", "MENU_GO")
      .in("source_record_id", menuIds)
      .limit(20);
    if (observationError) throw observationError;
    return { links: links ?? [], observations: observations ?? [] };
  }

  async listRegions() {
    const { data, error } = await this.supabase.rpc("list_administrative_regions_v1");
    if (error) throw error;
    return data ?? [];
  }

  async listSimilarMerchants(input: {
    regionId: string;
    bounds: { west: number; south: number; east: number; north: number };
    category: string;
    merchantId: string;
  }) {
    const page = await new CanonicalMerchantReadService(this.supabase).list({
      ...input.bounds,
      limit: MAX_SIMILAR_MERCHANTS + 1,
      offset: 0,
      keyword: null,
      category: input.category,
      regionIds: [input.regionId],
    });
    return page.merchants
      .filter((merchant) => merchant.id !== input.merchantId)
      .slice(0, MAX_SIMILAR_MERCHANTS);
  }

  async listTransit(latitude: number, longitude: number) {
    return new TransportNodeRepository(this.supabase).findNear(
      { latitude, longitude, radius_meters: TRANSIT_SEARCH_RADIUS_METERS },
      { limit: 10, offset: 0, page: 1, sort: "created_at", order: "desc" },
    );
  }
}
