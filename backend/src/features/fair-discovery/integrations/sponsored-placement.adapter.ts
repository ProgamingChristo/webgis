import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { AdServingService, SponsoredPinDTO } from "@/src/features/umkm-advertising";
import { DiscoveryQuery } from "../types/fair-discovery.types";
import {
  MAX_SPONSORED_RESULTS_PER_DISCOVERY,
} from "../constants/fair-discovery.constants";
import { CommuterNetworkRepository, evaluateOpeningHours } from "@/src/features/commuter";

export class SponsoredPlacementAdapter {
  private readonly adServingService: AdServingService;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.adServingService = new AdServingService(supabase);
  }

  /**
   * Fetches eligible sponsored pin candidates and applies the SAME canonical hard constraints
   * as organic discovery (category matching, search query matching, walking limit).
   * Guarantees failure isolation: If the advertising engine encounters an error,
   * it returns an empty array instead of failing the entire discovery request.
   */
  async getEligibleSponsoredPlacements(
    query: DiscoveryQuery,
    now: Date = new Date()
  ): Promise<SponsoredPinDTO[]> {
    try {
      // 1. Query candidate sponsored pins at the spatial context origin
      const rawCandidates = await this.adServingService.getSponsoredPinCandidates({
        context: {
          longitude: query.origin.longitude,
          latitude: query.origin.latitude,
        },
        limit: 5,
        now,
      });

      if (!rawCandidates || rawCandidates.length === 0) {
        return [];
      }

      const merchantIds = rawCandidates.map((candidate) => candidate.merchant_id);
      const scheduleByMerchant = new Map<string, unknown>();
      if (query.openNow) {
        const { data, error } = await this.supabase
          .from("merchants")
          .select("id, opening_hours")
          .in("id", merchantIds);
        if (error) throw error;
        for (const row of data ?? []) scheduleByMerchant.set(row.id, row.opening_hours);
      }

      const walkingByMerchant = new Map();
      if (query.maxWalkingMinutes && query.maxWalkingMinutes > 0) {
        const walking = await new CommuterNetworkRepository(this.supabase).walkingCosts(
          { ...query.origin, source: "EXPLICIT_ORIGIN" },
          rawCandidates.map((candidate) => ({
            candidate_id: candidate.merchant_id,
            longitude: candidate.geometry.coordinates[0],
            latitude: candidate.geometry.coordinates[1],
          })),
        );
        for (const evidence of walking.candidates) {
          walkingByMerchant.set(evidence.candidate_id, evidence);
        }
      }

      const filtered: SponsoredPinDTO[] = [];

      // 2. Apply canonical hard constraints to each sponsored candidate
      for (const candidate of rawCandidates) {
        // 2.1. Category Relevance Constraint
        if (query.category && query.category.trim() !== "" && query.category.toLowerCase() !== "semua") {
          const normCat = query.category.toLowerCase();
          const candidateCat = (candidate.merchant_category || "").toLowerCase();
          const candidateHeadline = (candidate.headline || "").toLowerCase();
          const candidateDesc = (candidate.description || "").toLowerCase();

          const matchesCategory =
            candidateCat.includes(normCat) ||
            candidateHeadline.includes(normCat) ||
            candidateDesc.includes(normCat) ||
            this.matchCategorySynonyms(normCat, candidateCat);

          if (!matchesCategory) {
            continue;
          }
        }

        // 2.2. Query / Search Term Constraint
        if (query.query && query.query.trim() !== "") {
          const normQ = query.query.toLowerCase();
          const nameMatch = candidate.merchant_name.toLowerCase().includes(normQ);
          const headlineMatch = (candidate.headline || "").toLowerCase().includes(normQ);
          const descMatch = (candidate.description || "").toLowerCase().includes(normQ);
          const catMatch = (candidate.merchant_category || "").toLowerCase().includes(normQ);

          if (!nameMatch && !headlineMatch && !descMatch && !catMatch) {
            continue;
          }
        }

        if (query.openNow && evaluateOpeningHours(scheduleByMerchant.get(candidate.merchant_id), now) !== "OPEN") {
          continue;
        }

        // 2.3. Walking Time Constraint
        if (query.maxWalkingMinutes && query.maxWalkingMinutes > 0) {
          const route = walkingByMerchant.get(candidate.merchant_id);
          if (
            route?.status !== "ROUTABLE" ||
            route.duration_seconds === null ||
            route.duration_seconds > query.maxWalkingMinutes * 60
          ) {
            continue;
          }
        }

        filtered.push(candidate);
      }

      // 3. Cap sponsored placement count (Strict MVP limit = 1)
      return filtered.slice(0, MAX_SPONSORED_RESULTS_PER_DISCOVERY);
    } catch (err) {
      // Failure Isolation: Ad serving failure MUST NOT break organic discovery
      console.warn("[SponsoredPlacementAdapter] Ad serving lookup failed gracefully:", err);
      return [];
    }
  }

  /**
   * Helper to match standard category aliases and synonyms in Indonesian / English.
   */
  private matchCategorySynonyms(queryCat: string, merchantCat: string): boolean {
    const synonyms: Record<string, string[]> = {
      makanan: ["food", "kuliner", "resto", "restaurant", "warung", "cafe", "cafe_resto", "fnb", "food_beverage"],
      minuman: ["beverage", "kopi", "coffee", "cafe", "fnb", "food_beverage"],
      kopi: ["coffee", "cafe", "kafe", "minuman", "fnb"],
      retail: ["toko", "kelontong", "shop", "mart"],
      fashion: ["pakaian", "baju", "distro", "boutique", "apparel"],
    };

    const targetSynonyms = synonyms[queryCat] || [];
    return targetSynonyms.some((syn) => merchantCat.includes(syn));
  }

}
