"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, Gem, Sparkles, Store } from "lucide-react";

export function DiscoveryDisclosure({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 text-left font-medium text-slate-300 hover:text-white"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Prinsip Penelusuran Adil (GETRA Fair Discovery)
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2.5 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-400">
          <p>
            GETRA berkomitmen menjaga netralitas dan transparansi hasil penelusuran bagi commuter dan UMKM:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
              <span className="flex items-center gap-1 font-bold text-slate-200 mb-1">
                <Store className="w-3.5 h-3.5 text-blue-400" />
                Original (Organik)
              </span>
              <p className="text-slate-400 text-[10px]">
                Urutan murni berdasarkan kedekatan jarak dan filter yang Anda pilih. Peringkat ini tidak dapat dibeli.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-950/60 bg-emerald-950/20 p-2.5">
              <span className="flex items-center gap-1 font-bold text-emerald-300 mb-1">
                <Gem className="w-3.5 h-3.5 text-emerald-400" />
                Hidden Gem
              </span>
              <p className="text-emerald-400/80 text-[10px]">
                Kurasi berbasis skor kelengkapan data dan interaksi komunitas transit.
              </p>
            </div>

            <div className="rounded-lg border border-amber-950/60 bg-amber-950/20 p-2.5">
              <span className="flex items-center gap-1 font-bold text-amber-300 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Sponsored
              </span>
              <p className="text-amber-400/80 text-[10px]">
                Promosi berbayar yang relevan dengan query Anda. Selalu berlabel jelas dan dibatasi agar tidak mendominasi.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
