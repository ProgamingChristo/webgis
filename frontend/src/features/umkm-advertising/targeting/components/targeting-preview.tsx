"use client";

import React from "react";
import { MapPin, Target } from "lucide-react";
import { CampaignTarget } from "../types/targeting.types";
import { TargetingStatus } from "./targeting-status";

interface TargetingPreviewProps {
  target: CampaignTarget | null;
}

export function TargetingPreview({ target }: TargetingPreviewProps) {
  if (!target || target.status === "NOT_CONFIGURED") {
    return (
      <div className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center">
        <Target className="mx-auto mb-2 h-5 w-5 text-gray-400" />
        <p className="text-sm font-semibold text-gray-700">Targeting Belum Dikonfigurasi</p>
        <p className="text-xs text-gray-500 mt-1">
          Pilih metode Radius atau Study Area untuk menentukan wilayah promosi campaign ini.
        </p>
      </div>
    );
  }

  const formatDistance = (meters: number | null) => {
    if (!meters) return "-";
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km (${meters} meter)`;
    }
    return `${meters} meter`;
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm space-y-3">
      <div className="flex flex-col items-start gap-2 border-b border-gray-100 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <h5 className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-gray-800">
          <Target className="h-4 w-4 shrink-0" />
          <span className="break-words">Ringkasan Target Area</span>
        </h5>
        <TargetingStatus status={target.status} />
      </div>

      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div>
          <span className="text-gray-500 block">Metode:</span>
          <span className="font-semibold text-gray-800">
            {target.targetType === "RADIUS" ? "Radius Sekitar Outlet" : "Zona Study Area"}
          </span>
        </div>

        {target.targetType === "RADIUS" ? (
          <div>
            <span className="text-gray-500 block">Jangkauan Radius:</span>
            <span className="font-bold text-emerald-700">{formatDistance(target.radiusMeters)}</span>
          </div>
        ) : (
          <div>
            <span className="text-gray-500 block">Wilayah Studi:</span>
            <span className="font-bold text-emerald-700">{target.studyArea?.name || "-"}</span>
          </div>
        )}
      </div>

      {target.targetType === "RADIUS" && target.merchantLocation && (
        <div className="flex min-w-0 flex-col gap-1 border-t border-gray-100 pt-2 text-[11px] text-gray-500 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />Pusat Target:</span>
          <span className="break-all font-mono">
            {target.merchantLocation.latitude.toFixed(5)}, {target.merchantLocation.longitude.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}
