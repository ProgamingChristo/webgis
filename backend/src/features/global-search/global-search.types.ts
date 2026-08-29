import type { CanonicalMerchantMapItem } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";
import type {
  CommuterSearchMetadata,
  StructuredCommuterIntent,
} from "@/src/features/commuter/commuter.types";

export const SEARCH_SCOPE_TYPES = [
  "CURRENT_VIEWPORT",
  "REGION",
  "MULTI_REGION",
] as const;

export type SearchScopeType = typeof SEARCH_SCOPE_TYPES[number];

export interface SearchBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface SearchRegion {
  id: string;
  name: string;
  aliases: string[];
  bounds: SearchBounds;
  geometry_source: string;
}

export type ResolvedSearchIntent = StructuredCommuterIntent;

export interface GlobalSearchResult {
  intent: ResolvedSearchIntent;
  regions: SearchRegion[];
  available_regions: SearchRegion[];
  merchants: CanonicalMerchantMapItem[];
  total: number;
  limit: number;
  offset: number;
  commuter: CommuterSearchMetadata;
}
