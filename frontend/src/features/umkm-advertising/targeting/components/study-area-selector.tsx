"use client";

import React from "react";
import { StudyAreaSummary } from "../types/targeting.types";

interface StudyAreaSelectorProps {
  studyAreas: StudyAreaSummary[];
  selectedId: string;
  onChange: (id: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function StudyAreaSelector({
  studyAreas,
  selectedId,
  onChange,
  loading = false,
  disabled = false,
}: StudyAreaSelectorProps) {
  const selectedArea = studyAreas.find((a) => a.id === selectedId);

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Pilih Wilayah Studi (Study Area)
        </label>

        {loading ? (
          <div className="text-sm text-gray-500 py-2">Memuat daftar Study Area...</div>
        ) : studyAreas.length === 0 ? (
          <div className="text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded border border-amber-200">
            Tidak ada Study Area yang tersedia saat ini.
          </div>
        ) : (
          <select
            value={selectedId}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md shadow-sm p-2.5 bg-white focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">-- Pilih Study Area --</option>
            {studyAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedArea && (
        <div className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
          <p className="font-semibold text-gray-800 mb-1">{selectedArea.name}</p>
          <p className="text-gray-500">{selectedArea.description || "Wilayah studi operasional GETRA."}</p>
        </div>
      )}
    </div>
  );
}
