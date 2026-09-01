import React, { useState } from "react";
import { ContextualBannerDTO } from "../types/contextual-banner.types";
import { Sparkles, Megaphone, Navigation, User, ArrowRight } from "lucide-react";
import { useAdImpression, useCampaignEvent } from "../../events";

interface ContextualBannerProps {
  banner: ContextualBannerDTO;
  onCtaClick?: (banner: ContextualBannerDTO, ctaType: string) => void;
  className?: string;
}

export function ContextualBanner({
  banner,
  onCtaClick,
  className = "",
}: ContextualBannerProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { trackProfileOpen, trackRouteRequest } = useCampaignEvent();
  const { ref } = useAdImpression<HTMLDivElement>({
    campaignId: banner.campaign_id,
    creativeId: banner.creative_id,
    placement: "CONTEXTUAL_BANNER",
    surface: "FAIR_DISCOVERY_FEED",
  });

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Promosi Bersponsor"
      className={`relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 p-4 shadow-lg shadow-amber-950/30 transition-all hover:border-amber-400 ${className}`}
    >
      {/* Top Header: Badge & Category */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 border border-amber-500/40">
          <Sparkles className="w-2.5 h-2.5" />
          Promosi Bersponsor
        </span>

        <span className="text-[10px] font-semibold text-slate-400">
          {banner.merchant_category}
        </span>
      </div>

      <div className="flex items-start gap-3.5">
        {/* Creative Image if available and not failed */}
        {banner.image_url && !imageFailed && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-amber-900/50 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.image_url}
              alt={banner.headline}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <h4 className="break-words text-sm font-bold leading-5 text-slate-100 line-clamp-2">
              {banner.headline}
            </h4>
          </div>

          <p className="mt-0.5 break-words text-xs font-semibold leading-5 text-amber-300/90 line-clamp-2">
            {banner.merchant_name}
          </p>

          {banner.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {banner.description}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-3 flex flex-col items-stretch gap-2 border-t border-slate-800/80 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] text-slate-500 italic">
          Iklan terverifikasi GETRA
        </span>

        <button
          type="button"
          onClick={() => {
            if (banner.cta_type === "REQUEST_ROUTE") {
              trackRouteRequest({
                campaignId: banner.campaign_id,
                creativeId: banner.creative_id,
                placement: "CONTEXTUAL_BANNER",
                surface: "FAIR_DISCOVERY_FEED",
              });
            } else {
              trackProfileOpen({
                campaignId: banner.campaign_id,
                creativeId: banner.creative_id,
                placement: "CONTEXTUAL_BANNER",
                surface: "FAIR_DISCOVERY_FEED",
              });
            }
            onCtaClick?.(banner, banner.cta_type);
          }}
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow transition hover:from-amber-500 hover:to-amber-400"
        >
          {banner.cta_type === "REQUEST_ROUTE" ? (
            <>
              <Navigation className="w-3 h-3" />
              Petunjuk Rute
            </>
          ) : (
            <>
              <User className="w-3 h-3" />
              Lihat Profil
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
