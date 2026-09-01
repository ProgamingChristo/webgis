import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CommuterNetworkRepository,
  MAX_WALKING_CANDIDATES,
  parseDeterministicCommuterText,
} from "@/src/features/commuter";
import type { CommuterSearchMetadata } from "@/src/features/commuter/commuter.types";

import type { GlobalSearchQuery } from "@/src/features/global-search/global-search.schema";
import {
  extractRegionFromQuery,
  findRegionByText,
  GLOBAL_SEARCH_REGION_IDS,
  normalizeSearchText,
} from "@/src/features/global-search/global-search-regions";
import type {
  GlobalSearchResult,
  ResolvedSearchIntent,
  SearchBounds,
  SearchRegion,
} from "@/src/features/global-search/global-search.types";
import { CanonicalMerchantReadService } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";
import { ApplicationError } from "@/src/lib/errors";

export class GlobalSearchService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async search(query: GlobalSearchQuery): Promise<GlobalSearchResult> {
    const availableRegions = await this.listRegions();
    const intent = resolveGlobalSearchIntent(query, availableRegions);
    if (intent.constraints.walking && !intent.origin) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Pilih titik awal untuk menggunakan batas waktu berjalan.",
      );
    }
    const hasHardConstraints = Boolean(
      intent.constraints.budget || intent.constraints.opening || intent.constraints.walking,
    );
    const candidateLimit = intent.constraints.walking ? MAX_WALKING_CANDIDATES : 100;
    const globalScope = intent.scope.type === "GLOBAL";
    const page = await new CanonicalMerchantReadService(this.supabase).list({
      west: globalScope ? undefined : intent.scope.bounds.west,
      south: globalScope ? undefined : intent.scope.bounds.south,
      east: globalScope ? undefined : intent.scope.bounds.east,
      north: globalScope ? undefined : intent.scope.bounds.north,
      limit: hasHardConstraints ? candidateLimit : query.limit,
      offset: hasHardConstraints ? 0 : query.offset,
      keyword: intent.keyword,
      category: intent.category,
      regionIds: intent.scope.region_ids,
    });

    const metadata: CommuterSearchMetadata = {
      candidate_count: page.merchants.length,
      constrained_count: 0,
      excluded: {
        budget: 0,
        unknown_price: 0,
        closed: 0,
        unknown_hours: 0,
        walking_time: 0,
        unroutable: 0,
      },
      hard_constraints_applied: [],
      constraints_relaxed: false,
      regions: availableRegions.filter((region) => intent.scope.region_ids.includes(region.id)),
    };

    let merchants = page.merchants;
    if (intent.constraints.budget) {
      metadata.hard_constraints_applied.push("MAX_BUDGET_IDR");
      merchants = merchants.filter((merchant) => {
        if (merchant.observedPriceAmount === null) {
          metadata.excluded.unknown_price += 1;
          return false;
        }
        if (merchant.observedPriceAmount > intent.constraints.budget!.max_idr) {
          metadata.excluded.budget += 1;
          return false;
        }
        return true;
      });
    }

    if (intent.constraints.opening) {
      metadata.hard_constraints_applied.push("OPEN_NOW_ASIA_JAKARTA");
      merchants = merchants.filter((merchant) => {
        if (merchant.openingStatus === "UNKNOWN") {
          metadata.excluded.unknown_hours += 1;
          return false;
        }
        if (merchant.openingStatus === "CLOSED") {
          metadata.excluded.closed += 1;
          return false;
        }
        return true;
      });
    }

    if (intent.constraints.walking && intent.origin) {
      metadata.hard_constraints_applied.push("MAX_NETWORK_WALKING_MINUTES");
      const walking = await new CommuterNetworkRepository(this.supabase).walkingCosts(
        intent.origin,
        merchants.slice(0, MAX_WALKING_CANDIDATES).map((merchant) => ({
          candidate_id: merchant.id,
          longitude: merchant.longitude,
          latitude: merchant.latitude,
        })),
      );
      const evidence = new Map(walking.candidates.map((item) => [item.candidate_id, item]));
      merchants = merchants.filter((merchant) => {
        const route = evidence.get(merchant.id);
        if (!route || route.status !== "ROUTABLE" || route.duration_seconds === null) {
          metadata.excluded.unroutable += 1;
          return false;
        }
        if (route.duration_seconds > intent.constraints.walking!.max_minutes * 60) {
          metadata.excluded.walking_time += 1;
          return false;
        }
        merchant.networkRouteStatus = "ROUTABLE";
        merchant.networkDistanceMeters = route.distance_meters ?? undefined;
        merchant.networkDurationSeconds = route.duration_seconds;
        merchant.distanceMeters = Math.round(route.distance_meters ?? 0);
        merchant.walkingMinutes = Math.max(1, Math.ceil(route.duration_seconds / 60));
        return true;
      });
    }

    metadata.constrained_count = merchants.length;
    const resultMerchants = hasHardConstraints
      ? merchants.slice(query.offset, query.offset + query.limit)
      : merchants;

    const selected = new Set(intent.scope.region_ids);
    return {
      intent,
      regions: availableRegions.filter((region) => selected.has(region.id)),
      available_regions: availableRegions,
      merchants: resultMerchants,
      total: hasHardConstraints ? merchants.length : page.total,
      limit: query.limit,
      offset: query.offset,
      commuter: metadata,
    };
  }

  private async listRegions(): Promise<SearchRegion[]> {
    const { data, error } = await this.supabase.rpc("list_administrative_regions_v1");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      aliases: row.aliases ?? [],
      bounds: {
        west: Number(row.west),
        south: Number(row.south),
        east: Number(row.east),
        north: Number(row.north),
      },
      geometry_source: row.geometry_source,
    }));
  }
}

export function resolveGlobalSearchIntent(
    query: GlobalSearchQuery,
    regions: SearchRegion[],
  ): ResolvedSearchIntent {
    const originalQuery = query.q.trim();
    const parsedCommuter = parseDeterministicCommuterText(originalQuery);
    const queryLocation = extractRegionFromQuery(parsedCommuter.keyword_text);
    const explicitLocation = query.location_text
      ? findRegionByText(query.location_text)
      : null;
    if (query.location_text && !explicitLocation) {
      throw new ApplicationError("VALIDATION_ERROR", "Lokasi tidak ditemukan.");
    }

    const locationRegion = explicitLocation ?? queryLocation?.region ?? null;
    let regionIds = locationRegion ? [locationRegion.id] : [...new Set(query.region_ids)];
    if (regionIds.some((id) => !GLOBAL_SEARCH_REGION_IDS.includes(id as never))) {
      throw new ApplicationError("VALIDATION_ERROR", "Wilayah tidak ditemukan.");
    }

    let scopeType: ResolvedSearchIntent["scope"]["type"] =
      query.scope === "GLOBAL" ? "GLOBAL" : "CURRENT_VIEWPORT";
    if (locationRegion || regionIds.length === 1) scopeType = "REGION";
    if (!locationRegion && regionIds.length > 1) scopeType = "MULTI_REGION";
    if (query.scope === "MULTI_REGION" && regionIds.length < 2) {
      throw new ApplicationError("VALIDATION_ERROR");
    }
    if (query.scope === "REGION" && regionIds.length !== 1 && !locationRegion) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    let bounds: SearchBounds;
    if (scopeType === "GLOBAL") {
      bounds = { west: -180, south: -90, east: 180, north: 90 };
      regionIds = [];
    } else if (scopeType === "CURRENT_VIEWPORT") {
      if (
        query.west === undefined || query.south === undefined ||
        query.east === undefined || query.north === undefined
      ) throw new ApplicationError("VALIDATION_ERROR");
      bounds = {
        west: query.west,
        south: query.south,
        east: query.east,
        north: query.north,
      };
      regionIds = [];
    } else {
      const selectedRegions = regions.filter((region) => regionIds.includes(region.id));
      if (selectedRegions.length !== regionIds.length) {
        throw new ApplicationError("VALIDATION_ERROR", "Wilayah tidak ditemukan.");
      }
      bounds = mergeBounds(selectedRegions.map((region) => region.bounds));
    }

    return {
      domain: "MERCHANT",
      original_query: originalQuery,
      keyword: queryLocation
        ? queryLocation.keyword
        : normalizeSearchText(parsedCommuter.keyword_text) || null,
      location_text: locationRegion?.name ?? null,
      scope: { type: scopeType, region_ids: regionIds, bounds },
      category: query.category?.trim() || null,
      constraints: {
        budget: query.max_budget
          ? { max_idr: query.max_budget }
          : parsedCommuter.constraints.budget,
        opening: query.open_now
          ? { open_now: true, timezone: "Asia/Jakarta" }
          : parsedCommuter.constraints.opening,
        walking: query.max_walking_minutes
          ? { max_minutes: query.max_walking_minutes }
          : parsedCommuter.constraints.walking,
      },
      origin: query.origin_longitude !== undefined && query.origin_latitude !== undefined
        ? {
            longitude: query.origin_longitude,
            latitude: query.origin_latitude,
            source: query.origin_source ?? "EXPLICIT_ORIGIN",
          }
        : null,
      parser: "DETERMINISTIC",
      confidence: parsedCommuter.confidence,
    };
}

function mergeBounds(bounds: SearchBounds[]): SearchBounds {
  const first = bounds[0];
  if (!first) throw new ApplicationError("VALIDATION_ERROR");
  return bounds.slice(1).reduce((merged, current) => ({
    west: Math.min(merged.west, current.west),
    south: Math.min(merged.south, current.south),
    east: Math.max(merged.east, current.east),
    north: Math.max(merged.north, current.north),
  }), { ...first });
}
