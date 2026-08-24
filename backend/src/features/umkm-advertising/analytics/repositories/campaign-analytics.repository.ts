import { SupabaseClient } from "@supabase/supabase-js";
import {
  CampaignAnalyticsSummary,
  TimeseriesPoint,
  PlacementBreakdownItem,
} from "../types/campaign-analytics.types";

export class CampaignAnalyticsRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async aggregateCampaignEvents(
    campaignId: string,
    from?: string,
    to?: string,
    placementFilter?: string
  ): Promise<{
    summary: CampaignAnalyticsSummary;
    timeseries: TimeseriesPoint[];
    placementBreakdown: PlacementBreakdownItem[];
  }> {
    let query = this.supabase
      .from("campaign_events")
      .select("event_type, placement, occurred_at")
      .eq("campaign_id", campaignId);

    if (from) {
      query = query.gte("occurred_at", from);
    }
    if (to) {
      query = query.lte("occurred_at", to);
    }
    if (placementFilter) {
      query = query.eq("placement", placementFilter);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("[CampaignAnalyticsRepository] Query error:", error);
      throw new Error("Gagal mengambil data event analitik.");
    }

    const allEvents = events || [];

    // 1. Overall Summary Totals
    let impressions = 0;
    let sponsoredPinClicks = 0;
    let profileOpens = 0;
    let routeRequests = 0;

    let sponsoredPinImpressions = 0;

    // 2. Timeseries buckets
    const timeseriesMap: Record<
      string,
      { impressions: number; clicks: number; profileOpens: number; routeRequests: number }
    > = {};

    // 3. Placement breakdown buckets
    const placementMap: Record<
      string,
      { impressions: number; clicks: number; profileOpens: number; routeRequests: number }
    > = {
      SPONSORED_PIN: { impressions: 0, clicks: 0, profileOpens: 0, routeRequests: 0 },
      CONTEXTUAL_BANNER: { impressions: 0, clicks: 0, profileOpens: 0, routeRequests: 0 },
      PROFILE_POSTER: { impressions: 0, clicks: 0, profileOpens: 0, routeRequests: 0 },
    };

    for (const ev of allEvents) {
      const type = ev.event_type;
      const placement = ev.placement;
      const dateStr = new Date(ev.occurred_at).toISOString().split("T")[0];

      if (!timeseriesMap[dateStr]) {
        timeseriesMap[dateStr] = {
          impressions: 0,
          clicks: 0,
          profileOpens: 0,
          routeRequests: 0,
        };
      }

      if (!placementMap[placement]) {
        placementMap[placement] = {
          impressions: 0,
          clicks: 0,
          profileOpens: 0,
          routeRequests: 0,
        };
      }

      if (type === "IMPRESSION") {
        impressions++;
        timeseriesMap[dateStr].impressions++;
        placementMap[placement].impressions++;
        if (placement === "SPONSORED_PIN") {
          sponsoredPinImpressions++;
        }
      } else if (type === "SPONSORED_PIN_CLICK") {
        sponsoredPinClicks++;
        timeseriesMap[dateStr].clicks++;
        placementMap[placement].clicks++;
      } else if (type === "PROFILE_OPEN") {
        profileOpens++;
        timeseriesMap[dateStr].profileOpens++;
        placementMap[placement].profileOpens++;
      } else if (type === "ROUTE_REQUEST") {
        routeRequests++;
        timeseriesMap[dateStr].routeRequests++;
        placementMap[placement].routeRequests++;
      }
    }

    // Compute derived CTR for Sponsored Pin
    const sponsoredPinCtr =
      sponsoredPinImpressions > 0
        ? parseFloat(((sponsoredPinClicks / sponsoredPinImpressions) * 100).toFixed(2))
        : 0.0;

    const summary: CampaignAnalyticsSummary = {
      impressions,
      sponsored_pin_clicks: sponsoredPinClicks,
      profile_opens: profileOpens,
      route_requests: routeRequests,
      sponsored_pin_ctr: sponsoredPinCtr,
    };

    // Sort timeseries chronologically
    const sortedDates = Object.keys(timeseriesMap).sort();
    const timeseries: TimeseriesPoint[] = sortedDates.map((date) => ({
      date,
      impressions: timeseriesMap[date].impressions,
      sponsored_pin_clicks: timeseriesMap[date].clicks,
      profile_opens: timeseriesMap[date].profileOpens,
      route_requests: timeseriesMap[date].routeRequests,
    }));

    const placementBreakdown: PlacementBreakdownItem[] = [
      {
        placement: "SPONSORED_PIN",
        impressions: placementMap.SPONSORED_PIN.impressions,
        clicks: placementMap.SPONSORED_PIN.clicks,
        profile_opens: placementMap.SPONSORED_PIN.profileOpens,
        route_requests: placementMap.SPONSORED_PIN.routeRequests,
      },
      {
        placement: "CONTEXTUAL_BANNER",
        impressions: placementMap.CONTEXTUAL_BANNER.impressions,
        clicks: placementMap.CONTEXTUAL_BANNER.clicks,
        profile_opens: placementMap.CONTEXTUAL_BANNER.profileOpens,
        route_requests: placementMap.CONTEXTUAL_BANNER.routeRequests,
      },
      {
        placement: "PROFILE_POSTER",
        impressions: placementMap.PROFILE_POSTER.impressions,
        clicks: placementMap.PROFILE_POSTER.clicks,
        profile_opens: placementMap.PROFILE_POSTER.profileOpens,
        route_requests: placementMap.PROFILE_POSTER.routeRequests,
      },
    ];

    return {
      summary,
      timeseries,
      placementBreakdown,
    };
  }
}
