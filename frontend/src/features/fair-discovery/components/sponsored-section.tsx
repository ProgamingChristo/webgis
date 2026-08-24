"use client";

import React from "react";
import { SponsoredPinDTO } from "@/src/features/umkm-advertising";
import { SponsoredPinCard } from "@/src/features/umkm-advertising";
import { Sparkles, Info } from "lucide-react";

interface SponsoredSectionProps {
  sponsored: SponsoredPinDTO[];
  onSelectSponsored?: (placement: SponsoredPinDTO) => void;
  onCtaClick?: (placement: SponsoredPinDTO, ctaType: string) => void;
  className?: string;
}

export function SponsoredSection({
  sponsored,
  onSelectSponsored,
  onCtaClick,
  className = "",
}: SponsoredSectionProps) {
  if (!sponsored || sponsored.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Promosi Bersponsor ({sponsored.length})
        </h4>
        <span className="text-[10px] text-amber-500 font-semibold bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800 flex items-center gap-1">
          <Info className="w-2.5 h-2.5" />
          Relevan dengan Pencarian
        </span>
      </div>

      <div className="space-y-3">
        {sponsored.map((item) => (
          <div
            key={item.campaign_id}
            onClick={() => onSelectSponsored?.(item)}
            className="cursor-pointer"
          >
            <SponsoredPinCard
              placement={item}
              onCtaClick={(cta) => onCtaClick?.(item, cta)}
              className="w-full !border-amber-500/40 !bg-gradient-to-br !from-slate-900 !via-amber-950/20 !to-slate-900 shadow-xl hover:!border-amber-400 transition-all"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
