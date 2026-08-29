"use client";

import React from "react";
import { HiddenGemDTO } from "../types/fair-discovery.types";
import { Gem, MapPin, Footprints, Navigation, Sparkles } from "lucide-react";

interface HiddenGemSectionProps {
  hiddenGems: HiddenGemDTO[];
  selectedId?: string | null;
  onSelectMerchant?: (merchant: HiddenGemDTO) => void;
  onRequestRoute?: (merchant: HiddenGemDTO) => void;
  className?: string;
}

export function HiddenGemSection({
  hiddenGems,
  selectedId,
  onSelectMerchant,
  onRequestRoute,
  className = "",
}: HiddenGemSectionProps) {
  if (!hiddenGems || hiddenGems.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Gem className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Hidden Gem Rekomendasi ({hiddenGems.length})
        </h4>
        <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
          Kurasi Komunitas
        </span>
      </div>

      <div className="space-y-2">
        {hiddenGems.map((m) => {
          const isSelected = selectedId === m.id;

          return (
            <article
              key={m.id}
              onClick={() => onSelectMerchant?.(m)}
              className={`group relative overflow-hidden rounded-xl border p-3.5 transition-all cursor-pointer ${
                isSelected
                  ? "border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-950/60"
                  : "border-emerald-900/50 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 hover:border-emerald-700"
              }`}
            >
              {/* Glowing Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {m.name}
                    </h5>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300 border border-emerald-500/30">
                      <Sparkles className="w-2 h-2" />
                      Gem
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {m.category}
                  </p>
                </div>

                {m.price_level && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                    {m.price_level}
                  </span>
                )}
              </div>

              {m.address && (
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                  {m.address}
                </p>
              )}

              {/* Gem Reason */}
              <div className="mt-2 rounded bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-300 border border-emerald-900/40">
                ✨ {m.gem_reason}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-300 font-semibold">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {m.distance_meters >= 1000
                      ? `${(m.distance_meters / 1000).toFixed(1)} km`
                      : `${m.distance_meters} m`}
                  </span>

                  {m.walking_minutes !== null ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Footprints className="w-3 h-3" />
                      {m.walking_minutes} mnt jaringan
                    </span>
                  ) : null}
                </div>

                {onRequestRoute && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestRoute(m);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-600 transition shadow-sm"
                  >
                    <Navigation className="w-2.5 h-2.5" />
                    Rute
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
