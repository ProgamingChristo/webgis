export const DEMAND_MODEL_VERSION = "GETRA_DEMAND_V1" as const;
export const RETAIL_GAP_MODEL_VERSION = "GETRA_RETAIL_GAP_V1" as const;

export const ANALYTICS_CATEGORY_SLUGS = [
  "bakso",
  "nasi-goreng",
  "coffee",
  "restaurant",
  "warung",
  "street-food",
  "fast-food",
  "food",
  "beverage",
  "minimarket",
  "retail",
  "pharmacy",
  "health",
  "laundry",
  "services",
] as const;

export const ANALYTICS_WEIGHTS = {
  SEARCH: 1,
  ROUTE_REQUEST: 2,
  COMMUTER_REQUEST: 1.5,
  TRANSACTION_OBSERVATION: 2,
  CAMPAIGN_INTERACTION: 0,
} as const;

export const ANALYTICS_DEDUP_WINDOW_MS = 5 * 60 * 1_000;
export const MAX_ANALYTICS_WINDOW_DAYS = 90;
