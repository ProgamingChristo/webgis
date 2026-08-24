"use client";

import React from "react";
import { OriginalMerchantDTO } from "../types/fair-discovery.types";
import { Store, MapPin, Footprints, Navigation } from "lucide-react";

interface OriginalResultsSectionProps {
  merchants: OriginalMerchantDTO[];
  selectedId?: string | null;
  onSelectMerchant?: (merchant: OriginalMerchantDTO) => void;
  onRequestRoute?: (merchant: OriginalMerchantDTO) => void;
  className?: string;
}

export function OriginalResultsSection({
  merchants,
  selectedId,
  onSelectMerchant,
  onRequestRoute,
  className = "",
}: OriginalResultsSectionProps) {
  if (!merchants || merchants.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-blue-400" />
          Hasil Penelusuran Organik ({merchants.length})
        </h4>
        <span className="text-[10px] text-slate-500 font-medium">Berdasarkan Kedekatan Jarak</span>
      </div>

      <div className="space-y-2">
        {merchants.map((m) => {
          const isSelected = selectedId === m.id;

          return (
            <article
              key={m.id}
              onClick={() => onSelectMerchant?.(m)}
              className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                isSelected
                  ? "border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-950/50"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {m.name}
                  </h5>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {m.category}
                  </p>
                </div>

                {m.price_level && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {m.price_level}
                  </span>
                )}
              </div>

              {m.address && (
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                  {m.address}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-300 font-semibold">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    {m.distance_meters >= 1000
                      ? `${(m.distance_meters / 1000).toFixed(1)} km`
                      : `${m.distance_meters} m`}
                  </span>

                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Footprints className="w-3 h-3" />
                    ~{m.walking_minutes} mnt
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {onRequestRoute && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestRoute(m);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-200 hover:bg-cyan-600 hover:text-white transition"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      Rute
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
