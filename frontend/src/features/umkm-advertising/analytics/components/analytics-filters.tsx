"use client";

import React from "react";
import { Filter, Megaphone } from "lucide-react";

interface FilterProps {
  campaigns: { id: string; name: string }[];
  selectedCampaignId: string;
  onCampaignChange: (id: string) => void;
  dateRange: "7d" | "30d" | "all";
  onDateRangeChange: (range: "7d" | "30d" | "all") => void;
  selectedPlacement?: string;
  onPlacementChange: (placement?: string) => void;
}

export function AnalyticsFilters({
  campaigns,
  selectedCampaignId,
  onCampaignChange,
  dateRange,
  onDateRangeChange,
  selectedPlacement,
  onPlacementChange,
}: FilterProps) {
  return (
    <div className="p-4 rounded-2xl border border-slate-700/60 bg-slate-800/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Campaign Selector */}
      <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
        <Megaphone size={16} className="text-blue-400 shrink-0" />
        <select
          value={selectedCampaignId}
          onChange={(e) => onCampaignChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white outline-none focus:border-blue-500 transition-colors"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => onDateRangeChange("7d")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              dateRange === "7d"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => onDateRangeChange("30d")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              dateRange === "30d"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            30 Hari
          </button>
          <button
            type="button"
            onClick={() => onDateRangeChange("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              dateRange === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Semua
          </button>
        </div>

        {/* Placement Filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          <select
            value={selectedPlacement || ""}
            onChange={(e) => onPlacementChange(e.target.value || undefined)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Semua Placement</option>
            <option value="SPONSORED_PIN">Sponsored Pin</option>
            <option value="CONTEXTUAL_BANNER">Promo Banner</option>
            <option value="PROFILE_POSTER">Profile Poster</option>
          </select>
        </div>
      </div>
    </div>
  );
}
