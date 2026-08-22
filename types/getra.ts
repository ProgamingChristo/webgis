export type DataStatus = "synthetic" | "surveyed" | "verified";

export type MerchantCategory = string;

export type Merchant = {
  id: string;
  name: string;
  category: MerchantCategory;
  brand: string;
  longitude: number;
  latitude: number;
  walkingMinutes: number;
  distanceMeters: number;
  accessibilityScore: number;
  priceLabel: "Hemat" | "Sedang" | "Premium";
  openNow: boolean;
  source: string;
  status: DataStatus;
  updatedAt: string;
  limitation: string;
  address?: string;
  phone?: string;
  district?: string;
  village?: string;
  city?: string;
  province?: string;
  collectedAt?: string;
};

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};
