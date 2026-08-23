"use client";

import React from "react";
import { CampaignReadinessResult } from "../types/lifecycle.types";
import { 
  Store, 
  Palette, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Info 
} from "lucide-react";

interface CampaignReadinessPanelProps {
  readiness: CampaignReadinessResult;
  className?: string;
}

export function CampaignReadinessPanel({
  readiness,
  className = "",
}: CampaignReadinessPanelProps) {
  const { checks, blockers, ready } = readiness;

  const passedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = 4;
  const progressPercent = Math.round((passedCount / totalCount) * 100);

  const items = [
    {
      id: "merchant",
      title: "Kelayakan Toko UMKM",
      passed: checks.merchant,
      descPassed: "Profil lengkap, koordinat valid, dan kepemilikan terverifikasi",
      descFailed: "Klaim kepemilikan atau profil toko belum memenuhi syarat",
      icon: Store,
    },
    {
      id: "creative",
      title: "Materi Iklan (Creative)",
      passed: checks.creative,
      descPassed: "Minimal 1 materi iklan berstatus Siap (Ready)",
      descFailed: "Belum ada materi iklan yang diset Siap (Ready)",
      icon: Palette,
    },
    {
      id: "targeting",
      title: "Target Wilayah (Spatial)",
      passed: checks.targeting,
      descPassed: "Radius atau Study Area telah ditentukan",
      descFailed: "Target jangkauan wilayah belum dikonfigurasi",
      icon: MapPin,
    },
    {
      id: "schedule",
      title: "Jadwal Waktu (Schedule)",
      passed: checks.schedule,
      descPassed: "Rentang waktu mulai dan selesai valid",
      descFailed: "Jadwal belum diisi atau waktu selesai di masa lalu",
      icon: Calendar,
    },
  ];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Kesiapan Aktivasi Campaign
            </h3>
            {ready ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Siap Tayang
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Belum Lengkap ({passedCount}/{totalCount})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Semua 4 parameter wajib terpenuhi agar campaign dapat aktif tayang secara otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:self-start">
          <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                ready ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {progressPercent}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                item.passed
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                  : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40"
              }`}
            >
              <div
                className={`p-2 rounded-md shrink-0 mt-0.5 ${
                  item.passed
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.title}
                  </span>
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {item.passed ? item.descPassed : item.descFailed}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {blockers.length > 0 && (
        <div className="mt-4 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Perhatian: </span>
            Lengkapi parameter di atas agar campaign masuk ke jadwal penayangan iklan.
          </div>
        </div>
      )}
    </div>
  );
}
