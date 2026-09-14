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
    <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
      {/* Campaign Selector */}
      <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
        <Megaphone size={16} className="text-blue-400 shrink-0" />
        <select
          value={selectedCampaignId}
          onChange={(e) => onCampaignChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => onDateRangeChange("7d")}
            style={{ color: dateRange === "7d" ? "#ffffff" : "#475569" }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              dateRange === "7d"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-sky-700"
            }`}
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => onDateRangeChange("30d")}
            style={{ color: dateRange === "30d" ? "#ffffff" : "#475569" }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              dateRange === "30d"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-sky-700"
            }`}
          >
            30 Hari
          </button>
          <button
            type="button"
            onClick={() => onDateRangeChange("all")}
            style={{ color: dateRange === "all" ? "#ffffff" : "#475569" }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              dateRange === "all"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-sky-700"
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
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Semua jenis tampilan</option>
            <option value="SPONSORED_PIN">Penanda promosi</option>
            <option value="CONTEXTUAL_BANNER">Banner promosi</option>
            <option value="PROFILE_POSTER">Poster profil</option>
          </select>
        </div>
      </div>
    </div>
  );
}
