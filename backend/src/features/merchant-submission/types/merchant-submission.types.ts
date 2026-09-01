export type MerchantSubmissionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface CreateMerchantSubmissionInput {
  name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  opening_hours?: Record<string, any>;
  public_media?: { storefront_url?: string | null; menu_urls: string[]; product_urls: string[] };
  business_info?: { contact_phone?: string | null; price_range?: string | null; payment_methods: string[] };
  image_url?: string | null;
}

export interface UpdateMerchantSubmissionInput {
  name?: string;
  category?: string;
  description?: string | null;
  address?: string | null;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  opening_hours?: Record<string, any>;
  public_media?: { storefront_url?: string | null; menu_urls: string[]; product_urls: string[] };
  business_info?: { contact_phone?: string | null; price_range?: string | null; payment_methods: string[] };
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
  opening_hours: Record<string, any>;
  public_media: { storefront_url?: string | null; menu_urls: string[]; product_urls: string[] };
  business_info: { contact_phone?: string | null; price_range?: string | null; payment_methods: string[] };
  image_url: string | null;
  status: MerchantSubmissionStatus;
  canonical_merchant_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DuplicateMerchantWarning {
  has_potential_duplicate: boolean;
  nearby_merchant_id?: string;
  nearby_merchant_name?: string;
  distance_meters?: number;
}
