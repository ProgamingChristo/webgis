"use client";

import React, { useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";
import { TimeseriesPoint } from "../types/campaign-analytics.types";

interface TimeseriesChartProps {
  timeseries: TimeseriesPoint[];
}

export function AnalyticsTimeseriesChart({ timeseries }: TimeseriesChartProps) {
  const [activeDate, setActiveDate] = useState<string | null>(null);

  if (timeseries.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 text-center py-10">
        <p className="text-xs text-slate-400">Belum ada riwayat aktivitas interaksi pada rentang waktu ini.</p>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxVal = Math.max(
    ...timeseries.map(
      (d) => Math.max(d.impressions, d.sponsored_pin_clicks, d.profile_opens, d.route_requests)
    ),
    5
  );

  const selectedPoint = timeseries.find((d) => d.date === activeDate) || timeseries[timeseries.length - 1];

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-slate-700/60 bg-slate-800/50 backdrop-blur space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            Tren Interaksi Harian
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Aktivitas tayangan dan interaksi iklan dari waktu ke waktu.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Tayangan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Klik Pin
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            Buka Profil
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Rute Jalan
          </span>
        </div>
      </div>

      {/* Interactive Bar Chart Area */}
      <div className="pt-4 pb-2">
        <div className="h-48 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-2">
          {timeseries.map((pt) => {
            const impHeight = Math.max((pt.impressions / maxVal) * 100, pt.impressions > 0 ? 6 : 0);
            const clickHeight = Math.max((pt.sponsored_pin_clicks / maxVal) * 100, pt.sponsored_pin_clicks > 0 ? 6 : 0);
            const profHeight = Math.max((pt.profile_opens / maxVal) * 100, pt.profile_opens > 0 ? 6 : 0);
            const routeHeight = Math.max((pt.route_requests / maxVal) * 100, pt.route_requests > 0 ? 6 : 0);

            const isSelected = activeDate === pt.date;

            return (
              <div
                key={pt.date}
                onClick={() => setActiveDate(pt.date)}
                className={`flex-1 min-w-[36px] flex flex-col items-center justify-end h-full cursor-pointer group p-1 rounded-lg transition-colors ${
                  isSelected ? "bg-slate-700/60" : "hover:bg-slate-700/30"
                }`}
              >
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  {/* Impressions bar */}
                  <div
                    style={{ height: `${impHeight}%` }}
                    className="w-1.5 sm:w-2 bg-blue-500 rounded-t-sm transition-all group-hover:brightness-125"
                    title={`Tayangan: ${pt.impressions}`}
                  />
                  {/* Pin clicks bar */}
                  <div
                    style={{ height: `${clickHeight}%` }}
                    className="w-1.5 sm:w-2 bg-amber-500 rounded-t-sm transition-all group-hover:brightness-125"
                    title={`Klik Pin: ${pt.sponsored_pin_clicks}`}
                  />
                  {/* Profile opens bar */}
                  <div
                    style={{ height: `${profHeight}%` }}
                    className="w-1.5 sm:w-2 bg-purple-500 rounded-t-sm transition-all group-hover:brightness-125"
                    title={`Buka Profil: ${pt.profile_opens}`}
                  />
                  {/* Route requests bar */}
                  <div
                    style={{ height: `${routeHeight}%` }}
                    className="w-1.5 sm:w-2 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-125"
                    title={`Rute: ${pt.route_requests}`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                  {pt.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Breakdown */}
      {selectedPoint ? (
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Calendar size={13} className="text-slate-400" />
            <span>Tanggal: {selectedPoint.date}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-blue-400">Tayangan: {selectedPoint.impressions}</span>
            <span className="text-amber-400">Klik Pin: {selectedPoint.sponsored_pin_clicks}</span>
            <span className="text-purple-400">Buka Profil: {selectedPoint.profile_opens}</span>
            <span className="text-emerald-400">Rute: {selectedPoint.route_requests}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
