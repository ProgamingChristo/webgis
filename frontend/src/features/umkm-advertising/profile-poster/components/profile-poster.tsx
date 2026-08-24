import React, { useState } from "react";
import { ProfilePosterDTO } from "../types/profile-poster.types";
import { Sparkles, Calendar, Navigation } from "lucide-react";
import { useAdImpression, useCampaignEvent } from "../../events";

interface ProfilePosterProps {
  poster: ProfilePosterDTO;
  onRequestRoute?: (poster: ProfilePosterDTO) => void;
  className?: string;
}

export function ProfilePoster({
  poster,
  onRequestRoute,
  className = "",
}: ProfilePosterProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { trackRouteRequest } = useCampaignEvent();
  const { ref } = useAdImpression<HTMLDivElement>({
    campaignId: poster.campaign_id,
    creativeId: poster.creative_id,
    placement: "PROFILE_POSTER",
    surface: "MERCHANT_PROFILE_DRAWER",
  });

  const formattedEndDate = poster.campaign_end_at
    ? new Date(poster.campaign_end_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Promosi Merchant Bersponsor"
      className={`relative overflow-hidden rounded-xl border border-amber-500/50 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 p-4 shadow-md shadow-amber-950/40 ${className}`}
    >
      {/* Badge Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 border border-amber-500/40">
          <Sparkles className="w-2.5 h-2.5" />
          Promosi Spesial
        </span>

        {formattedEndDate && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <Calendar className="w-2.5 h-2.5 text-amber-400" />
            Hingga {formattedEndDate}
          </span>
        )}
      </div>

      {/* Poster Image if available */}
      {poster.image_url && !imageFailed && (
        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-lg border border-amber-900/40 bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster.image_url}
            alt={poster.headline}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <h4 className="text-sm font-bold text-slate-100">
        {poster.headline}
      </h4>

      {poster.description && (
        <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
          {poster.description}
        </p>
      )}

      {/* Action Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
        <span className="text-[10px] text-slate-500 italic">
          Promosi resmi merchant
        </span>

        {onRequestRoute && (
          <button
            type="button"
            onClick={() => {
              trackRouteRequest({
                campaignId: poster.campaign_id,
                creativeId: poster.creative_id,
                placement: "PROFILE_POSTER",
                surface: "MERCHANT_PROFILE_DRAWER",
              });
              onRequestRoute(poster);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition"
          >
            <Navigation className="w-3 h-3" />
            Petunjuk Rute
          </button>
        )}
      </div>
    </div>
  );
}
