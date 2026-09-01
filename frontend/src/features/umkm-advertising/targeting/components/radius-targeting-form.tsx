"use client";

import React from "react";
import { AlertTriangle, MapPin } from "lucide-react";
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
          <div className="flex min-w-0 flex-col gap-1 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 sm:flex-row sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold"><MapPin className="h-3.5 w-3.5 shrink-0" />Lokasi Terverifikasi UMKM</span>
            <span className="break-all font-mono text-gray-500">
              ({merchantLocation.latitude.toFixed(5)}, {merchantLocation.longitude.toFixed(5)})
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Lokasi merchant belum terdeteksi. Pastikan data merchant memiliki koordinat yang valid.</span>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-sm font-semibold text-gray-700">
            Jangkauan Radius
          </label>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-700">
            {formatDistance(radiusMeters)}
          </span>
        </div>

        {/* Preset buttons */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
