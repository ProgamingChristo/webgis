"use client";

import { useState } from "react";
import Link from "next/link";
import { Train, Navigation, CheckCircle2, Footprints, ArrowRight } from "lucide-react";
import { TRANSIT_HUBS } from "../data";

export function TransitView() {
  const [selectedHubId, setSelectedHubId] = useState<string>(TRANSIT_HUBS[0].id);
  const [catchmentRadius, setCatchmentRadius] = useState<number>(400); // 200, 400, 600m
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const selectedHub = TRANSIT_HUBS.find((h) => h.id === selectedHubId) || TRANSIT_HUBS[0];

  const filteredHubs = filterCategory === "ALL"
    ? TRANSIT_HUBS
    : TRANSIT_HUBS.filter((h) => h.category === filterCategory || (filterCategory === "MRT" && h.lines.some(l => l.includes("MRT"))));

  const filteredMerchants = selectedHub.nearbyMerchants.filter(
    (m) => m.distanceMeters <= catchmentRadius
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-sky-950/80 to-slate-950 p-6 sm:p-8 text-white shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/40">
              <Train size={14} className="text-cyan-400" /> Simpul Antarmoda & Kawasan Transit
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Hub Transit & Interkoneksi UMKM Pejalan Kaki
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
              Jelajahi titik simpul transportasi publik Jabodetabek terpadu, area tangkapan pejalan kaki (walkshed), dan ribuan usaha mikro di sekitarnya tanpa polusi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
            >
              <Navigation size={16} /> Buka Peta Interaktif
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "INTEGRATED", "MRT", "KRL"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition border ${
                filterCategory === cat
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20"
                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {cat === "ALL" ? "Semua Simpul Transit" : cat === "INTEGRATED" ? "Hub Terpadu (TOD)" : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span>Radius Tangkapan:</span>
          {[200, 400, 600].map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => setCatchmentRadius(radius)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                catchmentRadius === radius
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {radius}m ({Math.round(radius / 80)} mnt)
            </button>
          ))}
        </div>
      </div>

      {/* Hub Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Station List */}
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Daftar Simpul ({filteredHubs.length})
          </h2>
          <div className="space-y-2.5">
            {filteredHubs.map((hub) => {
              const isSelected = hub.id === selectedHub.id;
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setSelectedHubId(hub.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-950/40 shadow-xl shadow-cyan-500/10 text-white"
                      : "border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm leading-snug">{hub.name}</h3>
                    <span className="shrink-0 rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase font-mono">
                      {hub.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{hub.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Footprints size={12} /> {hub.connectedMerchantsCount} UMKM terhubung
                    </span>
                    <span>~{(hub.dailyPassengers / 1000).toFixed(0)}rb komuter/hari</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed View */}
        <div className="space-y-6 lg:col-span-2">
          {/* Station Overview Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                  {selectedHub.category} • {selectedHub.id.toUpperCase()}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">{selectedHub.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedHub.description}</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 uppercase">Volume Komuter Harian</span>
                <p className="text-xl font-black text-cyan-400">
                  {selectedHub.dailyPassengers.toLocaleString("id-ID")} <span className="text-xs text-slate-400 font-normal">pax/hari</span>
                </p>
              </div>
            </div>

            {/* Lines & Interconnections */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Moda & Jalur Terhubung:</span>
              <div className="flex flex-wrap gap-2">
                {selectedHub.lines.map((line) => (
                  <span
                    key={line}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    {line}
                  </span>
                ))}
              </div>
            </div>

            {/* Pedestrian Amenities Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Fasilitas Pejalan Kaki & Aksesibilitas:</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  selectedHub.accessibleElevator ? "Lift Difabel Aktif" : "Tangga Landai",
                  "Ubin Pemandu Tunanetra",
                  "Koneksi Rute Pedestrian",
                  "Parkir Sepeda Transit",
                ].map((fac) => (
                  <div
                    key={fac}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300"
                  >
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{fac}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Connected Nearby Merchants */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  UMKM Dalam Jangkauan ({filteredMerchants.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar usaha mikro dan kuliner dalam radius {catchmentRadius} meter ({Math.round(catchmentRadius / 80)} menit berjalan santai).
                </p>
              </div>
              <Link
                href="/directory"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Lihat Semua UMKM <ArrowRight size={14} />
              </Link>
            </div>

            {filteredMerchants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
                Tidak ada UMKM terdaftar pada radius {catchmentRadius}m. Coba tingkatkan radius tangkapan ke 600m.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredMerchants.map((merchant) => (
                  <div
                    key={merchant.name}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 hover:border-cyan-500/40 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-white">{merchant.name}</h4>
                        <span className="text-[10px] font-bold text-cyan-400 font-mono uppercase">{merchant.category}</span>
                      </div>
                      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        {merchant.walkingMinutes} mnt jalan
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                      <span>Jarak: <strong className="text-slate-200">{merchant.distanceMeters}m</strong></span>
                      <Link
                        href={`/app?dest=${encodeURIComponent(merchant.name)}`}
                        className="font-bold text-cyan-400 hover:underline flex items-center gap-0.5"
                      >
                        Mulai Rute <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
