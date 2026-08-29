export const BUSINESS_SPACE_MODEL_VERSION = "GETRA_BUSINESS_SPACE_CONTEXT_V1" as const;
export const BUSINESS_SPACE_CATCHMENT_MINUTES = 10 as const;
export const BUSINESS_SPACE_MAX_CANDIDATES = 24 as const;
export const BUSINESS_SPACE_MAX_COMPARISON = 4 as const;
export const BUSINESS_SPACE_FRESH_DAYS = 30 as const;
export const BUSINESS_SPACE_AGING_DAYS = 90 as const;
export const BUSINESS_SPACE_SUPPLY_BBOX_DEGREES = 0.015 as const;

export const BUSINESS_SPACE_LIMITATIONS = [
  "Properti Go is treated as a property observation, not a live marketplace listing.",
  "Availability remains unconfirmed unless current evidence is explicitly present.",
  "Demand, Supply, and Retail Gap are GETRA observed signals, not revenue, profit, or ROI forecasts.",
  "Walking claims use pgRouting network evidence only; missing routes are shown as unavailable.",
  "Comparable supply uses deduplicated canonical merchants and may be incomplete in pilot regions.",
] as const;
