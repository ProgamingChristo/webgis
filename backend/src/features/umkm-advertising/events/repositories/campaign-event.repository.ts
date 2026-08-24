import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { RecordEventResult } from "../types/campaign-event.types";

export class CampaignEventRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Idempotently inserts a campaign interaction event.
   * If a record with the same dedup_key already exists, safely catches the unique constraint
   * and returns { accepted: true, deduplicated: true }.
   */
  async insertEventIdempotent(payload: {
    campaign_id: string;
    merchant_id: string;
    creative_id: string | null;
    event_type: string;
    placement: string;
    session_key: string;
    dedup_key: string;
    context: Record<string, any>;
    occurred_at?: string;
  }): Promise<RecordEventResult> {
    try {
      const { data, error } = await (this.supabase as any)
        .from("campaign_events")
        .insert({
          campaign_id: payload.campaign_id,
          merchant_id: payload.merchant_id,
          creative_id: payload.creative_id,
          event_type: payload.event_type,
          placement: payload.placement,
          session_key: payload.session_key,
          dedup_key: payload.dedup_key,
          context: payload.context || {},
          occurred_at: payload.occurred_at || new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        // PostgreSQL unique violation code 23505
        if (error.code === "23505" || (error.message && error.message.includes("unique"))) {
          return {
            accepted: true,
            deduplicated: true,
          };
        }
        throw error;
      }

      return {
        accepted: true,
        deduplicated: false,
        event_id: data?.id,
      };
    } catch (err: any) {
      if (err?.code === "23505" || (err?.message && err.message.includes("unique"))) {
        return {
          accepted: true,
          deduplicated: true,
        };
      }
      throw err;
    }
  }

  /**
   * Diagnostic / verification helper to count recorded events.
   */
  async countEventsForCampaign(campaignId: string): Promise<number> {
    const { count, error } = await (this.supabase as any)
      .from("campaign_events")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if (error) {
      return 0;
    }
    return count ?? 0;
  }

  /**
   * Diagnostic helper to inspect recorded events.
   */
  async listEventsForCampaign(campaignId: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await (this.supabase as any)
      .from("campaign_events")
      .select("id, event_type, placement, creative_id, dedup_key, occurred_at, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }
    return data || [];
  }
}
