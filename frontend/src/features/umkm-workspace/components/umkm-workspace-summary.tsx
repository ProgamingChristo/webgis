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
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Store size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Merchant Terverifikasi</p>
          <p className="text-2xl font-bold text-white mt-0.5">{summary.verified_merchants_count}</p>
        </div>
      </div>

      {/* 2. Pending Submissions */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Pengajuan / Draft</p>
          <p className="text-2xl font-bold text-white mt-0.5">{summary.pending_submissions_count}</p>
        </div>
      </div>

      {/* 3. Active Campaigns */}
      <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Megaphone size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Campaign Iklan Aktif</p>
          <p className="text-2xl font-bold text-white mt-0.5">{summary.active_campaigns_count}</p>
        </div>
      </div>
    </div>
  );
}
