"use client";

import React from "react";
import { SponsoredPinDTO } from "../types/ad-serving.types";
import { Store, Navigation, ExternalLink, Sparkles } from "lucide-react";

interface SponsoredPinCardProps {
  placement: SponsoredPinDTO;
  onCtaClick?: (ctaType: string) => void;
  className?: string;
}

export function SponsoredPinCard({
  placement,
  onCtaClick,
  className = "",
}: SponsoredPinCardProps) {
  const {
    merchant_name,
    merchant_category,
    headline,
    description,
    cta_type,
    image_url,
  } = placement;

  const handleCta = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCtaClick) {
      onCtaClick(cta_type);
    }
  };

  return (
    <div
      className={`w-72 overflow-hidden rounded-xl border border-amber-200 bg-white p-4 shadow-xl dark:border-amber-900/50 dark:bg-slate-900 ${className}`}
    >
      {/* Header with Sponsored Tag & Category */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
          <Sparkles className="w-2.5 h-2.5" />
          Sponsored
        </span>

        <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {merchant_category}
        </span>
      </div>

      {/* Image if present */}
      {image_url && (
        <div className="mb-3 h-28 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image_url}
            alt={headline}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Headline & Merchant Name */}
      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
        {headline}
      </h4>

      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Store className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{merchant_name}</span>
      </p>

      {/* Description */}
      {description && (
        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      {/* CTA Button */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {cta_type === "REQUEST_ROUTE" ? (
          <button
            type="button"
            onClick={handleCta}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:from-amber-600 hover:to-amber-700 transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            Lihat Rute ke Lokasi
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCta}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Kunjungi Profil Toko
          </button>
        )}
      </div>
    </div>
  );
}
