"use client";

import React from "react";
import { Eye, MapPin, Store, Navigation, Percent } from "lucide-react";
import { CampaignAnalyticsSummary } from "../types/campaign-analytics.types";

interface SummaryCardsProps {
  summary: CampaignAnalyticsSummary;
}

export function AnalyticsSummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Impressions */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-slate-400 font-medium">Tayangan (Impressions)</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Eye size={16} />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {summary.impressions.toLocaleString("id-ID")}
        </p>
        <span className="text-[10px] text-slate-400 mt-1 block">Muncul di layar / viewport peta</span>
      </div>

      {/* 2. Sponsored Pin Clicks */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-slate-400 font-medium">Klik Pin Promosi</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <MapPin size={16} />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {summary.sponsored_pin_clicks.toLocaleString("id-ID")}
        </p>
        <span className="text-[10px] text-slate-400 mt-1 block">Interaksi klik pin di peta</span>
      </div>

      {/* 3. Profile Opens */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-slate-400 font-medium">Buka Profil Toko</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Store size={16} />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {summary.profile_opens.toLocaleString("id-ID")}
        </p>
        <span className="text-[10px] text-slate-400 mt-1 block">Dari CTA pin & banner</span>
      </div>

      {/* 4. Route Requests */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-slate-400 font-medium">Panduan Rute Jalan</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Navigation size={16} />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {summary.route_requests.toLocaleString("id-ID")}
        </p>
        <span className="text-[10px] text-slate-400 mt-1 block">Navigasi ke lokasi outlet</span>
      </div>

      {/* 5. Sponsored Pin CTR */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-slate-400 font-medium">Sponsored Pin CTR</span>
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Percent size={16} />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {summary.sponsored_pin_ctr > 0 ? `${summary.sponsored_pin_ctr}%` : "0%"}
        </p>
        <span className="text-[10px] text-slate-400 mt-1 block">Rasio klik per tayangan pin</span>
      </div>
    </div>
  );
}
