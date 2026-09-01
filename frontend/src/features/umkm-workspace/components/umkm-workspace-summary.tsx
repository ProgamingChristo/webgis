"use client";

import React from "react";
import { Store, Clock, Megaphone } from "lucide-react";
import { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";

interface UmkmWorkspaceSummaryProps {
  summary: UmkmWorkspaceSummary;
}

export function UmkmWorkspaceSummaryView({ summary }: UmkmWorkspaceSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Verified Merchants */}
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 p-4 backdrop-blur sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 sm:h-12 sm:w-12">
          <Store size={24} />
        </div>
        <div className="min-w-0">
          <p className="break-words text-xs font-medium leading-5 text-slate-400">Merchant Terverifikasi</p>
          <p className="text-2xl font-bold text-white mt-0.5">{summary.verified_merchants_count}</p>
        </div>
      </div>

      {/* 2. Pending Submissions */}
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 p-4 backdrop-blur sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 sm:h-12 sm:w-12">
          <Clock size={24} />
        </div>
        <div className="min-w-0">
          <p className="break-words text-xs font-medium leading-5 text-slate-400">Pengajuan Aktif</p>
          <p className="text-2xl font-bold text-white mt-0.5">{summary.pending_submissions_count}</p>
        </div>
      </div>

      {/* 3. Active Campaigns */}
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 p-4 backdrop-blur sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 sm:h-12 sm:w-12">
          <Megaphone size={24} />
        </div>
        <div className="min-w-0">
          <p className="break-words text-xs font-medium leading-5 text-slate-400">Campaign Aktif</p>
          <p className="text-2xl font-bold text-white mt-0.5">{summary.active_campaigns_count}</p>
        </div>
      </div>
    </div>
  );
}
