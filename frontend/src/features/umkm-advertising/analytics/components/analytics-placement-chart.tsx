"use client";

import React from "react";
import { LayoutGrid, MapPin, Image as ImageIcon, FileText } from "lucide-react";
import { PlacementBreakdownItem } from "../types/campaign-analytics.types";

interface PlacementChartProps {
  breakdown: PlacementBreakdownItem[];
}

export function AnalyticsPlacementChart({ breakdown }: PlacementChartProps) {
  const getPlacementMeta = (placement: PlacementBreakdownItem["placement"]) => {
    switch (placement) {
      case "SPONSORED_PIN":
        return {
          label: "Penanda promosi",
          icon: MapPin,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10 border-amber-500/20",
          desc: "Ikon pin khusus pada peta navigasi",
        };
      case "CONTEXTUAL_BANNER":
        return {
          label: "Banner promosi sesuai lokasi",
          icon: ImageIcon,
          color: "text-blue-400",
          bgColor: "bg-blue-500/10 border-blue-500/20",
          desc: "Banner promosi dalam hasil penelusuran adil",
        };
      case "PROFILE_POSTER":
        return {
          label: "Poster profil",
          icon: FileText,
          color: "text-cyan-600",
          bgColor: "bg-cyan-50 border-cyan-200",
          desc: "Poster khusus pada profil usaha",
        };
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <LayoutGrid size={16} className="text-blue-400" />
          Rincian Berdasarkan Placement Iklan
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Distribusi tayangan dan interaksi di setiap media tampilan GETRA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {breakdown.map((item) => {
          const meta = getPlacementMeta(item.placement);
          const Icon = meta.icon;
          const totalInteractions = item.clicks + item.profile_opens + item.route_requests;

          return (
            <div
              key={item.placement}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${meta.bgColor} ${meta.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">{meta.label}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{meta.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 text-xs">
                <div className="rounded-lg bg-white p-2">
                  <span className="text-[10px] text-slate-400 block">Tayangan</span>
                  <span className="mt-0.5 block text-sm font-bold text-slate-900">{item.impressions}</span>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <span className="text-[10px] text-slate-400 block">Total Interaksi</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{totalInteractions}</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-400 pt-1">
                {item.placement === "SPONSORED_PIN" ? (
                  <div className="flex justify-between">
                    <span>Klik Pin:</span>
                    <strong className="text-slate-800">{item.clicks}</strong>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>Buka Profil:</span>
                  <strong className="text-slate-800">{item.profile_opens}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Petunjuk Rute:</span>
                  <strong className="text-slate-800">{item.route_requests}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
