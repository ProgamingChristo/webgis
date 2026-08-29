export type DataStatus = "synthetic" | "surveyed" | "verified";

export type MerchantCategory = string;

export type Merchant = {
  id: string;
  name: string;
  category: MerchantCategory;
  brand: string;
  longitude: number;
  latitude: number;
  walkingMinutes: number | null;
  distanceMeters: number | null;
  accessibilityScore: number;
  priceLabel: "Hemat" | "Sedang" | "Premium";
  openNow: boolean;
  source: string;
  status: DataStatus;
  updatedAt: string;
  limitation: string;
  address?: string;
  phone?: string;
  photo?: string;
  menuPhotos?: string[];
  menu?: string;
  observedPrice?: string;
  observedCondition?: string;
  mobility?: string;
  observedAt?: string;
  sources?: Array<"PREMIUM" | "MENU_GO">;
  provenance?: Record<string, unknown>;
  district?: string;
  village?: string;
  city?: string;
  province?: string;
  collectedAt?: string;
  openStatusKnown?: boolean;
  priceStatusKnown?: boolean;
  regionIds?: string[];
  regions?: string[];
  observedPriceAmount?: number | null;
  openingStatus?: "OPEN" | "CLOSED" | "UNKNOWN";
  networkRouteStatus?: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS";
  networkDistanceMeters?: number;
  networkDurationSeconds?: number;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};
