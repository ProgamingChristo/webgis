export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  photo_url?: string;
  is_available: boolean;
  tag?: string;
}

export interface AuthoritativeMerchantProfile {
  id: string;
  name: string;
  owner_id: string;
  verification_status: "VERIFIED" | "UNVERIFIED";
  publish_status: "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
  price_level: string | null;
  description: string | null;
  opening_hours: Record<string, { is_closed?: boolean; opens_at?: string | null; closes_at?: string | null }> | null;
  metadata: {
    category_label?: string;
    phone?: string;
    facilities?: string[];
    payment_methods?: string[];
    social_media?: {
      instagram?: string;
      [key: string]: string | undefined;
    };
    public_media?: {
      storefront_url?: string | null;
      menu_urls?: string[];
      product_urls?: string[];
    };
    menu_items?: MenuItem[];
    submitted_from_id?: string;
    approved_at?: string;
    approved_by?: string;
    [key: string]: unknown;
  };
  address: string | null;
  location: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateMerchantProfilePayload {
  description?: string;
  opening_hours?: Record<string, unknown>;
  metadata?: {
    phone?: string;
    facilities?: string[];
    payment_methods?: string[];
    social_media?: Record<string, string>;
    public_media?: Record<string, unknown>;
    menu_items?: MenuItem[];
  };
}
