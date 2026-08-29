import type {
  ContextualBannerDTO,
  SponsoredPinDTO,
} from "@/src/features/umkm-advertising";

export type {
  ContextualBannerDTO,
  SponsoredPinDTO,
};

export interface GeoPoint {
  longitude: number;
  latitude: number;
}

export interface DiscoveryQuery {
  origin: GeoPoint;
  radiusMeters?: number;
  category?: string;
  query?: string;
  openNow?: boolean;
  maxWalkingMinutes?: number;
  limit?: number;
}

export interface OriginalMerchantDTO {
  id: string;
  name: string;
  category: string;
  address?: string | null;
  village?: string | null;
  district?: string | null;
  city?: string | null;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  distance_meters: number;
  walking_minutes: number | null;
  open_now: boolean | null;
  route_status: "ROUTABLE" | "UNROUTABLE" | "NO_NETWORK_ACCESS" | null;
  data_quality_score?: number | null;
  price_level?: string | null;
}

export interface HiddenGemDTO extends OriginalMerchantDTO {
  hidden_gem: true;
  gem_badge: "HIDDEN_GEM";
  gem_reason: string;
}

export interface FairDiscoveryMetadata {
  total_original: number;
  total_hidden_gems: number;
  total_sponsored: number;
  sponsored_available: boolean;
  query_context: {
    origin: GeoPoint;
    radius_meters: number;
    category?: string;
    query?: string;
  };
}

export interface FairDiscoveryResult {
  original: OriginalMerchantDTO[];
  hidden_gems: HiddenGemDTO[];
  sponsored: SponsoredPinDTO[];
  contextual_banner?: ContextualBannerDTO | null;
  metadata: FairDiscoveryMetadata;
}
