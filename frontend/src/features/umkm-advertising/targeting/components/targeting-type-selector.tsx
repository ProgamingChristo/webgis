"use client";

import React from "react";
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
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("RADIUS")}
          className={`px-4 py-3 text-sm font-medium rounded-lg border text-left transition-all ${
            value === "RADIUS"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-base">📍</span>
            <span className="font-bold">Radius Merchant</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Menargetkan calon pelanggan dalam jarak tertentu dari outlet UMKM Anda.
          </p>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("STUDY_AREA")}
          className={`px-4 py-3 text-sm font-medium rounded-lg border text-left transition-all ${
            value === "STUDY_AREA"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-base">🗺️</span>
            <span className="font-bold">Study Area GETRA</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Menargetkan seluruh koridor atau zona wilayah studi pilot GETRA.
          </p>
        </button>
      </div>
    </div>
  );
}
