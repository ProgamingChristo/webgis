"use client";

import { Check, Coffee, Sparkles } from "lucide-react";

export interface ProfileFacilitiesCardProps {
  facilities: string[];
  onChange: (facilities: string[]) => void;
  disabled?: boolean;
}

export const ALL_FACILITIES = [
  "Wi-Fi Cepat",
  "Stop Kontak Banyak",
  "Area Bebas Rokok",
  "Outdoor Seating",
  "Parkir Sepeda",
  "QRIS / Cashless",
  "Take Away",
] as const;

export function ProfileFacilitiesCard({
  facilities,
  onChange,
  disabled = false,
}: ProfileFacilitiesCardProps) {
  const toggleFacility = (facilityName: string) => {
    if (disabled) return;
    if (facilities.includes(facilityName)) {
      onChange(facilities.filter((f) => f !== facilityName));
    } else {
      onChange([...facilities, facilityName]);
    }
  };

  const activeCount = facilities.length;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
            <Coffee size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Kenyamanan Gerai
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Fasilitas Gerai
            </h2>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
          <Sparkles size={12} />
          {activeCount} Aktif
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Pilih fasilitas yang tersedia di gerai Anda untuk mempermudah pejalan kaki dan komuter menemukan tempat yang sesuai kebutuhan.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {ALL_FACILITIES.map((facility) => {
          const isSelected = facilities.includes(facility);
          return (
            <button
              key={facility}
              type="button"
              onClick={() => toggleFacility(facility)}
              disabled={disabled}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all text-left ${
                isSelected
                  ? "border-sky-300 bg-sky-50/70 text-sky-900 shadow-xs ring-1 ring-sky-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className="truncate">{facility}</span>
              {isSelected ? (
                <Check size={14} className="text-sky-700 shrink-0 ml-1.5" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0 ml-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
