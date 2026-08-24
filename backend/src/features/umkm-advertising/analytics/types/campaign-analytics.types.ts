export interface CampaignAnalyticsSummary {
  impressions: number;
  sponsored_pin_clicks: number;
  profile_opens: number;
  route_requests: number;
  sponsored_pin_ctr: number; // e.g. 25.0 for 25%
}

export interface TimeseriesPoint {
  date: string; // YYYY-MM-DD
  impressions: number;
  sponsored_pin_clicks: number;
  profile_opens: number;
  route_requests: number;
}

export interface PlacementBreakdownItem {
  placement: "SPONSORED_PIN" | "CONTEXTUAL_BANNER" | "PROFILE_POSTER";
  impressions: number;
  clicks: number;
  profile_opens: number;
  route_requests: number;
}

export interface CampaignAnalyticsDTO {
  campaign: {
    id: string;
    name: string;
    status: string;
    merchant_id: string;
    merchant_name?: string;
  };
  period: {
    from: string;
    to: string;
  };
  summary: CampaignAnalyticsSummary;
  timeseries: TimeseriesPoint[];
  placement_breakdown: PlacementBreakdownItem[];
}
