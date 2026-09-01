"use client";

import React from "react";
import { MapPinned, Radar } from "lucide-react";
import { TargetType } from "../types/targeting.types";

interface TargetingTypeSelectorProps {
  value: TargetType;
  onChange: (type: TargetType) => void;
  disabled?: boolean;
}

export function TargetingTypeSelector({
  value,
  onChange,
  disabled = false,
}: TargetingTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        Metode Targeting
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("RADIUS")}
          className={`min-w-0 px-4 py-3 text-sm font-medium rounded-lg border text-left transition-all ${
            value === "RADIUS"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Radar className="h-4 w-4 shrink-0" />
            <span className="break-words font-bold">Radius Merchant</span>
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
            Menargetkan calon pelanggan dalam jarak tertentu dari outlet UMKM Anda.
          </p>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("STUDY_AREA")}
          className={`min-w-0 px-4 py-3 text-sm font-medium rounded-lg border text-left transition-all ${
            value === "STUDY_AREA"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MapPinned className="h-4 w-4 shrink-0" />
            <span className="break-words font-bold">Study Area GETRA</span>
          </div>
          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
            Menargetkan seluruh koridor atau zona wilayah studi pilot GETRA.
          </p>
        </button>
      </div>
    </div>
  );
}
