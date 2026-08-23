"use client";

import React from "react";
import { MIN_RADIUS_METERS, MAX_RADIUS_METERS } from "../schemas/targeting.schema";

interface RadiusTargetingFormProps {
  radiusMeters: number;
  onChange: (meters: number) => void;
  merchantLocation: { longitude: number; latitude: number } | null;
  disabled?: boolean;
}

const PRESET_RADIUS = [500, 1000, 2000, 5000];

export function RadiusTargetingForm({
  radiusMeters,
  onChange,
  merchantLocation,
  disabled = false,
}: RadiusTargetingFormProps) {
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
    }
    return `${meters} m`;
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Pusat Target (Center Point)
        </label>
        {merchantLocation ? (
          <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded border border-emerald-200">
            <span className="font-semibold">📍 Lokasi Terverifikasi UMKM</span>
            <span className="text-gray-500">
              ({merchantLocation.latitude.toFixed(5)}, {merchantLocation.longitude.toFixed(5)})
            </span>
          </div>
        ) : (
          <div className="text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded border border-amber-200">
            ⚠️ Lokasi merchant belum terdeteksi. Pastikan data merchant memiliki koordinat yang valid.
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-semibold text-gray-700">
            Jangkauan Radius
          </label>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            {formatDistance(radiusMeters)}
          </span>
        </div>

        {/* Preset buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESET_RADIUS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors ${
                radiusMeters === preset
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {formatDistance(preset)}
            </button>
          ))}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={MIN_RADIUS_METERS}
          max={MAX_RADIUS_METERS}
          step={50}
          value={radiusMeters}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />

        <div className="flex justify-between text-[11px] text-gray-400 mt-1">
          <span>{formatDistance(MIN_RADIUS_METERS)}</span>
          <span>{formatDistance(MAX_RADIUS_METERS)}</span>
        </div>
      </div>
    </div>
  );
}
