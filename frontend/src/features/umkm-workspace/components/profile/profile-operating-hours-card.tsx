"use client";

import { Clock, RefreshCw } from "lucide-react";
import {
  DAY_LABELS_ID,
  type DaySchedule,
  type WeekSchedule,
} from "../../utils/profile-hours-helper";

export interface ProfileOperatingHoursCardProps {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  disabled?: boolean;
}

const ORDERED_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function ProfileOperatingHoursCard({
  schedule,
  onChange,
  disabled = false,
}: ProfileOperatingHoursCardProps) {
  const updateDay = (day: string, patch: Partial<DaySchedule>) => {
    const current = schedule[day] || { is_closed: false, opens_at: "08:00", closes_at: "21:00" };
    onChange({
      ...schedule,
      [day]: {
        ...current,
        ...patch,
      },
    });
  };

  const setWeekdayStandard = () => {
    const next: WeekSchedule = { ...schedule };
    for (const d of ["monday", "tuesday", "wednesday", "thursday", "friday"]) {
      next[d] = { is_closed: false, opens_at: "07:00", closes_at: "22:00" };
    }
    next["saturday"] = { is_closed: false, opens_at: "08:00", closes_at: "22:00" };
    next["sunday"] = { is_closed: false, opens_at: "08:00", closes_at: "20:00" };
    onChange(next);
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Waktu Pelayanan
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Jadwal Operasional
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={setWeekdayStandard}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 disabled:opacity-50"
        >
          <RefreshCw size={12} />
          Set Jam Reguler
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {ORDERED_DAYS.map((dayKey) => {
          const dayData = schedule[dayKey] || {
            is_closed: false,
            opens_at: "08:00",
            closes_at: "21:00",
          };
          const isClosed = Boolean(dayData.is_closed);
          const opensAt = dayData.opens_at || "08:00";
          const closesAt = dayData.closes_at || "21:00";

          return (
            <div
              key={dayKey}
              className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isClosed
                  ? "border-slate-100 bg-slate-50/60 text-slate-400"
                  : "border-slate-200/80 bg-white text-slate-800 shadow-xs"
              }`}
            >
              {/* Day Label & Toggle */}
              <div className="flex items-center gap-3 min-w-[120px]">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isClosed}
                    onChange={(e) => updateDay(dayKey, { is_closed: !e.target.checked })}
                    disabled={disabled}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
                <span
                  className={`text-sm font-bold ${
                    isClosed ? "text-slate-400 line-through" : "text-slate-800"
                  }`}
                >
                  {DAY_LABELS_ID[dayKey]}
                </span>
              </div>

              {/* Time Controls */}
              <div className="flex items-center gap-2">
                {!isClosed ? (
                  <>
                    <input
                      type="time"
                      value={opensAt}
                      onChange={(e) => updateDay(dayKey, { opens_at: e.target.value })}
                      disabled={disabled}
                      aria-label={`Jam buka hari ${DAY_LABELS_ID[dayKey]}`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-100 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">—</span>
                    <input
                      type="time"
                      value={closesAt}
                      onChange={(e) => updateDay(dayKey, { closes_at: e.target.value })}
                      disabled={disabled}
                      aria-label={`Jam tutup hari ${DAY_LABELS_ID[dayKey]}`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-100 focus:outline-none"
                    />
                    <span className="text-[10px] font-semibold text-slate-500">WIB</span>
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-slate-200/60 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    Tutup
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
