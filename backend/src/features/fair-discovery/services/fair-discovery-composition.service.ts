import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import {
  DiscoveryQuery,
  FairDiscoveryResult,
  HiddenGemDTO,
  OriginalMerchantDTO,
} from "../types/fair-discovery.types";
import { SponsoredPlacementAdapter } from "../integrations/sponsored-placement.adapter";
import { ContextualBannerServingService, ContextualBannerDTO } from "@/src/features/umkm-advertising";
import {
  AVERAGE_WALKING_SPEED_METERS_PER_MINUTE,
  DEFAULT_DISCOVERY_LIMIT,
  DEFAULT_DISCOVERY_RADIUS_METERS,
  HIDDEN_GEM_MIN_DATA_QUALITY_SCORE,
  MAX_SPONSORED_RESULTS_PER_DISCOVERY,
} from "../constants/fair-discovery.constants";

export class FairDiscoveryCompositionService {
  private readonly sponsoredAdapter: SponsoredPlacementAdapter;
  private readonly bannerService: ContextualBannerServingService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.sponsoredAdapter = new SponsoredPlacementAdapter(supabase);
    this.bannerService = new ContextualBannerServingService(supabase);
  }

  /**
   * Main Fair Discovery composition engine.
   * Fetches canonical organic merchants, applies hard constraints, partitions into
   * Original and Hidden Gem streams, requests eligible Sponsored placements,
   * enforces deduplication, and returns a strictly separated result.
   */
  async discover(query: DiscoveryQuery, now: Date = new Date()): Promise<FairDiscoveryResult> {
    const {
      origin,
      radiusMeters = DEFAULT_DISCOVERY_RADIUS_METERS,
      category,
      query: searchTerm,
      openNow,
      maxWalkingMinutes,
      limit = DEFAULT_DISCOVERY_LIMIT,
    } = query;

    // 1. Fetch published merchants from database
    const { data: rawMerchants, error } = await this.supabase
      .from("merchants")
      .select("id, name, address, description, location, publish_status, verification_status, primary_category_id, price_level, data_quality_score, opening_hours")
      .not("publish_status", "eq", "ARCHIVED");

    if (error) {
      console.error("[FairDiscoveryCompositionService] Database query error:", error);
    }

    const merchants = rawMerchants || [];

    // 2. Map and filter organic candidates based on spatial proximity & hard constraints
    const organicCandidates: OriginalMerchantDTO[] = [];

    for (const m of merchants) {
      const coords = this.parseCoordinates(m.location);
      if (!coords) continue;

      const dist = this.calculateDistanceMeters(
        origin.longitude,
        origin.latitude,
        coords.longitude,
        coords.latitude
      );

      if (dist > radiusMeters) continue;

      const walkingMin = Math.round(dist / AVERAGE_WALKING_SPEED_METERS_PER_MINUTE);

      // Constraint: Max Walking Minutes
      if (maxWalkingMinutes && maxWalkingMinutes > 0 && walkingMin > maxWalkingMinutes) {
        continue;
      }

      const merchantCategory = m.primary_category_id || "UMKM";

      // Constraint: Category
      if (category && category.trim() !== "" && category.toLowerCase() !== "semua") {
        const normCat = category.toLowerCase();
        const candCat = merchantCategory.toLowerCase();
        const candName = (m.name || "").toLowerCase();
        const candDesc = (m.description || "").toLowerCase();

        const matchesCategory =
          candCat.includes(normCat) ||
          candName.includes(normCat) ||
          candDesc.includes(normCat);

        if (!matchesCategory) continue;
      }

      // Constraint: Search Term / Query
      if (searchTerm && searchTerm.trim() !== "") {
        const normQ = searchTerm.toLowerCase();
        const nameMatch = (m.name || "").toLowerCase().includes(normQ);
        const descMatch = (m.description || "").toLowerCase().includes(normQ);
        const addrMatch = (m.address || "").toLowerCase().includes(normQ);
        const catMatch = merchantCategory.toLowerCase().includes(normQ);

        if (!nameMatch && !descMatch && !addrMatch && !catMatch) {
          continue;
        }
      }

      organicCandidates.push({
        id: m.id,
        name: m.name,
        category: merchantCategory,
        address: m.address || null,
        geometry: {
          type: "Point",
          coordinates: [coords.longitude, coords.latitude],
        },
        distance_meters: dist,
        walking_minutes: walkingMin,
        open_now: true, // Default open or checked via opening_hours
        data_quality_score: m.data_quality_score,
        price_level: m.price_level || null,
      });
    }

    // 3. Sort organic candidates by distance ascending (pure spatial proximity)
    organicCandidates.sort((a, b) => a.distance_meters - b.distance_meters);

    // 4. Partition into Original and Hidden Gems
    const hiddenGems: HiddenGemDTO[] = [];
    const regularOriginal: OriginalMerchantDTO[] = [];

    for (const item of organicCandidates) {
      if (
        item.data_quality_score &&
        item.data_quality_score >= HIDDEN_GEM_MIN_DATA_QUALITY_SCORE &&
        hiddenGems.length < 3
      ) {
        hiddenGems.push({
          ...item,
          hidden_gem: true,
          gem_badge: "HIDDEN_GEM",
          gem_reason: "Kurasi Komunitas GETRA & Skor Kualitas Data Tinggi",
        });
      } else {
        regularOriginal.push(item);
      }
    }

    // 5. Request eligible Sponsored placements via adapter (guaranteed failure isolation)
    let sponsoredCandidates: any[] = [];
    try {
      sponsoredCandidates = await this.sponsoredAdapter.getEligibleSponsoredPlacements(
        query,
        now
      );
    } catch (err) {
      console.warn("[FairDiscoveryCompositionService] Failed to load sponsored placements:", err);
      sponsoredCandidates = [];
    }

    const cappedSponsored = sponsoredCandidates.slice(0, MAX_SPONSORED_RESULTS_PER_DISCOVERY);

    // 6. Deduplication: Exclude sponsored merchants from duplicate visual appearance in organic lists
    const sponsoredMerchantIds = new Set(cappedSponsored.map((s) => s.merchant_id));

    const finalOriginal = regularOriginal
      .filter((item) => !sponsoredMerchantIds.has(item.id))
      .slice(0, limit);

    const finalHiddenGems = hiddenGems.filter(
      (item) => !sponsoredMerchantIds.has(item.id)
    );

    // 7. Request eligible Contextual Promo Banner (failure-isolated)
    let contextualBanner: ContextualBannerDTO | null = null;
    try {
      contextualBanner = await this.bannerService.getEligibleBanner(
        {
          longitude: origin.longitude,
          latitude: origin.latitude,
          radiusMeters,
          category,
          query: searchTerm,
          openNow,
          maxWalkingMinutes,
        },
        now
      );
    } catch (err) {
      console.warn("[FairDiscoveryCompositionService] Failed to load contextual banner:", err);
      contextualBanner = null;
    }

    // 8. Compose and return categorized FairDiscoveryResult
    return {
      original: finalOriginal,
      hidden_gems: finalHiddenGems,
      sponsored: cappedSponsored,
      contextual_banner: contextualBanner,
      metadata: {
        total_original: finalOriginal.length,
        total_hidden_gems: finalHiddenGems.length,
        total_sponsored: cappedSponsored.length,
        sponsored_available: cappedSponsored.length > 0 || contextualBanner !== null,
        query_context: {
          origin,
          radius_meters: radiusMeters,
          category,
          query: searchTerm,
        },
      },
    };
  }

  /**
   * Helper to parse GeoJSON Point / location object into { longitude, latitude }
   */
  private parseCoordinates(location: any): { longitude: number; latitude: number } | null {
    if (!location) return null;
    const loc = typeof location === "string" ? JSON.parse(location) : location;

    if (
      loc &&
      typeof loc === "object" &&
      Array.isArray(loc.coordinates) &&
      loc.coordinates.length >= 2
    ) {
      const [lng, lat] = loc.coordinates;
      if (
        typeof lng === "number" &&
        typeof lat === "number" &&
        Number.isFinite(lng) &&
        Number.isFinite(lat)
      ) {
        return { longitude: lng, latitude: lat };
      }
    }

    return null;
  }

  /**
   * Calculates geodesic distance in meters (Haversine formula).
   */
  private calculateDistanceMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}
