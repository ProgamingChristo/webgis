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
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <Train size={14} /> Antarmoda & Kawasan Transit
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Hub Transit & Interkoneksi UMKM Pejalan Kaki
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Jelajahi titik simpul transportasi publik Jabodetabek terpadu, area tangkapan pejalan kaki (walkshed), dan ribuan usaha mikro di sekitarnya tanpa polusi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-sky-400 transition"
            >
              <Navigation size={16} /> Buka Peta Interaktif
            </Link>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "INTEGRATED", "MRT", "KRL"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "ALL" ? "Semua Simpul Transit" : cat === "INTEGRATED" ? "Hub Terpadu (TOD)" : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span>Radius Tangkapan:</span>
          {[200, 400, 600].map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => setCatchmentRadius(radius)}
              className={`rounded-lg px-2.5 py-1 transition ${
                catchmentRadius === radius
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
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
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{hub.name}</h3>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                      {hub.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{hub.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Footprints size={12} className="text-sky-600" /> {hub.connectedMerchantsCount} UMKM terhubung
                    </span>
                    <span>~{(hub.dailyPassengers / 1000).toFixed(0)}rb komuter/hari</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Hub Detail & Merchant Catchment */}
        <div className="space-y-6 lg:col-span-2">
          {/* Hub Summary Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                  Simpul Terpilih
                </span>
                <h2 className="text-xl font-black text-slate-900">{selectedHub.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedHub.accessibleElevator && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={13} /> Lift Ramah Kursi Roda
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{selectedHub.description}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {selectedHub.lines.map((line, idx) => (
                <span key={idx} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {line}
                </span>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Volume Penumpang</span>
                <p className="text-base font-black text-slate-800">
                  {selectedHub.dailyPassengers.toLocaleString("id-ID")} org/hari
                </p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Radius Aktif</span>
                <p className="text-base font-black text-sky-600">{catchmentRadius} meter</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">UMKM Terjangkau</span>
                <p className="text-base font-black text-emerald-600">{filteredMerchants.length} usaha</p>
              </div>
            </div>
          </div>

          {/* Merchants in Walkshed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                UMKM dalam Radius Berjalan Kaki ({filteredMerchants.length})
              </h3>
              <span className="text-xs text-slate-500">
                Waktu tempuh dihitung berdasarkan kecepatan jalan kaki rata-rata (4.5 km/j)
              </span>
            </div>

            {filteredMerchants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Tidak ada UMKM dalam radius {catchmentRadius}m. Coba perlebar radius ke 600m.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredMerchants.map((merchant) => (
                  <div
                    key={merchant.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-sky-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{merchant.name}</h4>
                        <span className="shrink-0 rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                          {merchant.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{merchant.address}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="font-bold text-slate-700">
                        {merchant.distanceMeters}m · ~{merchant.walkingMinutes} menit jalan
                      </span>
                      <Link
                        href={`/app?destLat=${merchant.coordinates[1]}&destLng=${merchant.coordinates[0]}&destName=${encodeURIComponent(merchant.name)}`}
                        className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700"
                      >
                        Rute <ArrowRight size={13} />
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
