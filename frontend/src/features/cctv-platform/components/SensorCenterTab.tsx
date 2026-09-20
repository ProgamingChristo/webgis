"use client";

/**
 * GETRA Sensor Center Tab
 *
 * SENSOR DATA — strictly separated from CCTV and AI.
 *
 * Rules:
 * - Label [SENSOR DATA] is mandatory on every sensor panel
 * - All values are null/UNKNOWN until a real API connection is established
 * - Timestamps must be shown for every sensor reading
 * - Source URL must be cited
 * - No synthetic values
 */

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Cloud,
  Droplets,
  ExternalLink,
  Info,
  Gauge,
  ParkingCircle,
  Volume2,
  Wind,
  Zap,
} from "lucide-react";
import { SENSOR_REGISTRY, getSensorRegistryStats } from "../registry/sensor-registry";
import type { SensorType, SensorStatus } from "../types";

const SENSOR_TYPE_CONFIG: Record<SensorType, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  border: string;
}> = {
  AIR_QUALITY: { label: "Kualitas Udara", icon: Wind, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  TRAFFIC: { label: "Lalu Lintas", icon: Activity, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  WEATHER: { label: "Cuaca", icon: Cloud, color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
  FLOOD: { label: "Banjir", icon: Droplets, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  NOISE: { label: "Kebisingan", icon: Volume2, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  ENVIRONMENT: { label: "Lingkungan", icon: Zap, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  PARKING: { label: "Parkir", icon: ParkingCircle, color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  OTHER: { label: "Lainnya", icon: Gauge, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
};

const STATUS_CONFIG: Record<SensorStatus, { label: string; chip: string }> = {
  LIVE: { label: "LIVE", chip: "bg-green-100 text-green-700 border-green-200" },
  STALE: { label: "STALE", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  OFFLINE: { label: "OFFLINE", chip: "bg-red-100 text-red-700 border-red-200" },
  UNKNOWN: { label: "UNKNOWN", chip: "bg-slate-100 text-slate-600 border-slate-200" },
};

const SENSOR_CATEGORIES: Array<{ value: SensorType | "ALL"; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "AIR_QUALITY", label: "Kualitas Udara" },
  { value: "TRAFFIC", label: "Lalu Lintas" },
  { value: "WEATHER", label: "Cuaca" },
  { value: "FLOOD", label: "Banjir" },
  { value: "NOISE", label: "Kebisingan" },
  { value: "ENVIRONMENT", label: "Lingkungan" },
  { value: "PARKING", label: "Parkir" },
];

export function SensorCenterTab() {
  const stats = useMemo(() => getSensorRegistryStats(), []);
  const [selectedType, setSelectedType] = useState<SensorType | "ALL">("ALL");

  const filteredSensors = useMemo(() => {
    if (selectedType === "ALL") return SENSOR_REGISTRY;
    return SENSOR_REGISTRY.filter((s) => s.sensor_type === selectedType);
  }, [selectedType]);

  return (
    <div className="flex flex-col gap-4">

      {/* ================================================================== */}
      {/* Sensor Center Header                                                */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Gauge size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 border border-purple-200">
                SENSOR DATA
              </span>
            </div>
            <h2 className="text-base font-black text-purple-900">Sensor Center</h2>
            <p className="mt-0.5 text-xs text-purple-700 leading-relaxed">
              Data sensor kota Jakarta dari sumber resmi: ISPU (Dinas Lingkungan Hidup DKI),
              BMKG (cuaca), BPBD DKI (banjir). Sensor ditampilkan terpisah dari CCTV dan AI.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Stats row                                                            */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs text-center">
          <p className="text-xl font-black text-slate-800">{stats.total}</p>
          <span className="text-[10px] text-slate-600 font-semibold">Total Sensor</span>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-3 shadow-xs text-center">
          <p className="text-xl font-black text-green-700">{stats.live}</p>
          <span className="text-[10px] text-green-800 font-semibold">Live</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-xs text-center">
          <p className="text-xl font-black text-amber-700">{stats.stale}</p>
          <span className="text-[10px] text-amber-800 font-semibold">Stale</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-xs text-center">
          <p className="text-xl font-black text-slate-600">{stats.unknown}</p>
          <span className="text-[10px] text-slate-600 font-semibold">Unknown</span>
        </div>
      </div>

      {/* Data availability notice */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Status Sensor: Belum Terhubung ke API Real-time</p>
          <p className="text-amber-800 mt-0.5">
            Data sensor di bawah menampilkan registry lokasi sensor DKI Jakarta dari sumber resmi.
            Nilai aktual (ISPU, tinggi muka air, suhu) menampilkan DATA UNAVAILABLE karena GETRA
            belum memiliki koneksi API aktif ke portal sensor. Lihat sumber resmi di masing-masing kartu sensor.
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Category filter tabs                                                */}
      {/* ================================================================== */}
      <div className="flex flex-wrap gap-2">
        {SENSOR_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedType(cat.value as SensorType | "ALL")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              selectedType === cat.value
                ? "border-purple-300 bg-purple-100 text-purple-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat.label}
            {cat.value !== "ALL" && (
              <span className="ml-1 text-[10px] text-slate-600">
                ({SENSOR_REGISTRY.filter((s) => s.sensor_type === cat.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* Sensor cards                                                         */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredSensors.map((sensor) => {
          const typeConfig = SENSOR_TYPE_CONFIG[sensor.sensor_type];
          const statusConfig = STATUS_CONFIG[sensor.status];
          const Icon = typeConfig.icon;

          return (
            <div
              key={sensor.sensor_id}
              className={`rounded-2xl border ${typeConfig.border} ${typeConfig.bg} p-4`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60 ${typeConfig.color}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    {/* Mandatory label */}
                    <span className={`rounded text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${typeConfig.bg} ${typeConfig.color} border ${typeConfig.border}`}>
                      SENSOR DATA
                    </span>
                    <p className={`font-bold text-sm ${typeConfig.color} mt-0.5`}>
                      {sensor.sensor_name}
                    </p>
                  </div>
                </div>

                {/* Status chip */}
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusConfig.chip}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* Location */}
              <p className="mt-2 text-[11px] text-slate-600">{sensor.location}</p>
              <p className="text-[10px] text-slate-600">{sensor.district}, {sensor.city}</p>

              {/* Value */}
              <div className="mt-3 flex items-end gap-2">
                {sensor.value !== null ? (
                  <>
                    <span className={`text-2xl font-black ${typeConfig.color}`}>
                      {sensor.value}
                    </span>
                    <span className={`text-sm font-semibold ${typeConfig.color} mb-0.5`}>
                      {sensor.unit}
                    </span>
                    {sensor.quality && (
                      <span className="mb-0.5 ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {sensor.quality}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-600">—</span>
                    <span className="text-xs font-bold text-slate-600">DATA UNAVAILABLE</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                {sensor.description}
              </p>

              {/* Footer: provider + timestamp + source */}
              <div className="mt-3 space-y-1.5 border-t border-white/50 pt-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600">Provider</span>
                  <span className="font-semibold text-slate-700">{sensor.provider}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600">Timestamp</span>
                  <span className={`font-mono font-semibold ${sensor.timestamp ? "text-slate-700" : "text-slate-600"}`}>
                    {sensor.timestamp
                      ? new Date(sensor.timestamp).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "UNAVAILABLE"}
                  </span>
                </div>
                {sensor.source_url && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600">Sumber</span>
                    <a
                      href={sensor.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1 font-semibold underline ${typeConfig.color} hover:opacity-70`}
                    >
                      <ExternalLink size={9} />
                      Lihat Sumber
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600">Diverifikasi</span>
                  <span className="font-mono text-slate-600">
                    {sensor.last_verified_at ? new Date(sensor.last_verified_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Jakarta",
                    }) : "Belum diverifikasi"}
                  </span>
                </div>
              </div>

              {/* Source notes */}
              <p className="mt-2 text-[10px] italic text-slate-600 leading-relaxed">
                {sensor.source_notes}
              </p>
            </div>
          );
        })}
      </div>

      {/* Data truth footer */}
      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <Info size={14} className="shrink-0 mt-0.5 text-slate-600" />
        <p>
          <strong className="text-slate-600">Integritas Data Sensor:</strong> GETRA hanya menampilkan
          nilai sensor yang bersumber dari API publik yang terverifikasi. Nilai &quot;DATA UNAVAILABLE&quot;
          bukan angka nol — artinya data belum diterima dari sumber resmi. Sensor tidak dapat digunakan
          sebagai pengganti data CCTV, dan sebaliknya.
        </p>
      </div>
    </div>
  );
}
