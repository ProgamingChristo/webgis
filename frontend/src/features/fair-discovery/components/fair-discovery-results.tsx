"use client";

import React from "react";
import {
  FairDiscoveryResult,
  HiddenGemDTO,
  OriginalMerchantDTO,
} from "../types/fair-discovery.types";
import {
  SponsoredPinDTO,
  ContextualBanner,
  useCampaignEvent,
} from "@/src/features/umkm-advertising";
import { DiscoveryDisclosure } from "./discovery-disclosure";
import { OriginalResultsSection } from "./original-results-section";
import { HiddenGemSection } from "./hidden-gem-section";
import { SponsoredSection } from "./sponsored-section";
import { Loader2, Store } from "lucide-react";

interface FairDiscoveryResultsProps {
  result: FairDiscoveryResult | null;
  isLoading: boolean;
  error?: string | null;
  selectedId?: string | null;
  onSelectMerchant?: (merchant: OriginalMerchantDTO | HiddenGemDTO) => void;
  onSelectSponsored?: (placement: SponsoredPinDTO) => void;
  onRequestRoute?: (merchant: OriginalMerchantDTO | HiddenGemDTO | SponsoredPinDTO) => void;
  className?: string;
}

export function FairDiscoveryResults({
  result,
  isLoading,
  error,
  selectedId,
  onSelectMerchant,
  onSelectSponsored,
  onRequestRoute,
  className = "",
}: FairDiscoveryResultsProps) {
  const { trackProfileOpen, trackRouteRequest } = useCampaignEvent();

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <p className="text-xs font-semibold">Memuat penelusuran berimbang GETRA...</p>
        <span className="text-[10px] text-slate-500">Mengevaluasi hasil organik, hidden gem, dan sponsor relevan</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-xl border border-rose-900/50 bg-rose-950/30 text-rose-300 text-xs ${className}`}>
        <p className="font-bold">Gagal memuat hasil penelusuran:</p>
        <p className="mt-1 text-[11px] opacity-90">{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const hasAnyResults =
    result.original.length > 0 ||
    result.hidden_gems.length > 0 ||
    result.sponsored.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Fair Discovery Disclosure Banner */}
      <DiscoveryDisclosure />

      {/* Contextual Promo Banner Placement (Additive Phase 9) */}
      {result.contextual_banner && (
        <ContextualBanner
          banner={result.contextual_banner}
          onCtaClick={(banner, cta) => {
            if (cta === "REQUEST_ROUTE" && onRequestRoute) {
              onRequestRoute(banner as any);
            }
          }}
        />
      )}

      {!hasAnyResults ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-slate-500">
          <Store className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-400">
            Tidak ada merchant yang cocok di sekitar lokasi ini.
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            Coba ubah kata kunci atau perluas jangkauan pencarian Anda.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Sponsored Placement Section (Strictly transparent & capped) */}
          {result.sponsored.length > 0 && (
            <SponsoredSection
              sponsored={result.sponsored}
              onSelectSponsored={(placement) => {
                trackProfileOpen({
                  campaignId: placement.campaign_id,
                  creativeId: placement.creative_id,
                  placement: "SPONSORED_PIN",
                  surface: "FAIR_DISCOVERY_LIST",
                });
                onSelectSponsored?.(placement);
              }}
              onCtaClick={(placement, cta) => {
                if (cta === "REQUEST_ROUTE" && onRequestRoute) {
                  trackRouteRequest({
                    campaignId: placement.campaign_id,
                    creativeId: placement.creative_id,
                    placement: "SPONSORED_PIN",
                    surface: "FAIR_DISCOVERY_LIST",
                  });
                  onRequestRoute(placement);
                }
              }}
            />
          )}

          {/* 2. Hidden Gems Section (Community-curated) */}
          {result.hidden_gems.length > 0 && (
            <HiddenGemSection
              hiddenGems={result.hidden_gems}
              selectedId={selectedId}
              onSelectMerchant={onSelectMerchant}
              onRequestRoute={onRequestRoute}
            />
          )}

          {/* 3. Original Results Section (Pure proximity ranking) */}
          {result.original.length > 0 && (
            <OriginalResultsSection
              merchants={result.original}
              selectedId={selectedId}
              onSelectMerchant={onSelectMerchant}
              onRequestRoute={onRequestRoute}
            />
          )}
        </>
      )}
    </div>
  );
}
