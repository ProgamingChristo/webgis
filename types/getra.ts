export type DataStatus = "synthetic" | "surveyed" | "verified";

export type MerchantCategory =
  | "Kopi"
  | "Makanan"
  | "Minimarket"
  | "Apotek"
  | "Jasa";

export type Merchant = {
  id: string;
  name: string;
  category: MerchantCategory;
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
};
