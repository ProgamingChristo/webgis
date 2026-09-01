export type MerchantSubmissionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type MerchantOperatingHours = Record<string, {
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
}>;

export type MerchantPublicMedia = { storefront_url?: string | null; menu_urls: string[]; product_urls: string[] };
export type MerchantBusinessInfo = { contact_phone?: string | null; price_range?: "BUDGET" | "STANDARD" | "PREMIUM" | null; payment_methods: Array<"CASH" | "QRIS" | "DEBIT" | "TRANSFER"> };

export interface CreateMerchantSubmissionInput {
  name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  opening_hours?: MerchantOperatingHours;
  public_media: MerchantPublicMedia;
  business_info: MerchantBusinessInfo;
  image_url?: string | null;
}

export interface UpdateMerchantSubmissionInput {
  name?: string;
  category?: string;
  description?: string | null;
  address?: string | null;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
  opening_hours?: MerchantOperatingHours;
  public_media?: MerchantPublicMedia;
  business_info?: MerchantBusinessInfo;
  image_url?: string | null;
}

export interface MerchantSubmissionRecord {
  id: string;
  submitted_by: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  opening_hours: MerchantOperatingHours;
  public_media: MerchantPublicMedia;
  business_info: MerchantBusinessInfo;
  image_url: string | null;
  status: MerchantSubmissionStatus;
  canonical_merchant_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubmissionResult {
  submission: MerchantSubmissionRecord;
  duplicate_warning?: {
    has_potential_duplicate: boolean;
    nearby_merchant_name?: string;
  };
}

export interface ClaimableMerchant {
  id: string;
  name: string;
  category: string;
  address?: string;
  longitude: number;
  latitude: number;
  source: string;
  status: "surveyed" | "verified";
  observedPrice?: string;
  mobility?: string;
  observedAt?: string;
}

export interface ClaimableMerchantSearchResult {
  merchants: ClaimableMerchant[];
  total_available: number;
  has_more: boolean;
}
