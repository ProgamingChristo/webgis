import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANALYTICS_DEDUP_WINDOW_MS } from "./analytics.constants";
import { resolveAnalyticsCategory } from "./analytics-category";
import type { AnalyticsCategorySlug } from "./analytics.types";
import type { GlobalSearchResult } from "@/src/features/global-search/global-search.types";

export class AnalyticsEventService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async recordSearch(actorId: string, result: GlobalSearchResult): Promise<void> {
    const category = resolveAnalyticsCategory(
      result.intent.category ?? result.intent.keyword ?? result.intent.original_query,
    );
    const regionIds = result.intent.scope.region_ids.length
      ? result.intent.scope.region_ids
      : [...new Set(result.merchants.flatMap((merchant) => merchant.regionIds))];
    if (!category || regionIds.length === 0) return;
    await this.insert({
      actorId,
      eventType: "SEARCH",
      category,
      regionIds,
      resultCount: result.total,
      outcome: result.total > 0 ? "RESULTS" : "NO_RESULTS",
      metadata: { scope: result.intent.scope.type },
    });
  }

  async recordRoute(actorId: string, merchantId: string, outcome: string): Promise<void> {
    const { data, error } = await this.supabase.rpc("get_analytics_merchant_context_v1", {
      p_merchant_id: merchantId,
    });
    if (error) throw error;
    const context = data?.[0];
    const category = resolveAnalyticsCategory(context?.category_slug);
    const regionIds = Array.isArray(context?.region_ids) ? context.region_ids : [];
    if (!category || regionIds.length === 0) return;
    await this.insert({
      actorId,
      eventType: "ROUTE_REQUEST",
      category,
      regionIds,
      resultCount: null,
      outcome,
      metadata: { merchant_id: merchantId },
    });
  }

  private async insert(input: {
    actorId: string;
    eventType: "SEARCH" | "ROUTE_REQUEST";
    category: AnalyticsCategorySlug;
    regionIds: string[];
    resultCount: number | null;
    outcome: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const regionIds = [...new Set(input.regionIds)].sort().slice(0, 5);
    const bucket = Math.floor(Date.now() / ANALYTICS_DEDUP_WINDOW_MS);
    const dedupKey = createHash("sha256").update([
      input.actorId,
      input.eventType,
      input.category,
      regionIds.join(","),
      bucket,
    ].join("|")).digest("hex");
    const { error } = await this.supabase.from("analytics_events").upsert({
      event_type: input.eventType,
      dedup_key: dedupKey,
      category_slug: input.category,
      region_ids: regionIds,
      result_count: input.resultCount,
      outcome: input.outcome,
      metadata: input.metadata,
    }, { onConflict: "dedup_key", ignoreDuplicates: true });
    if (error) throw error;
  }
}
