"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Video,
  Car,
  Plane,
  Bike,
  Train,
  Users2,
  PlaneTakeoff,
  Layers,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  GLOBAL_CITIES,
  CCTV_FEEDS,
  CONGESTION_ZONES,
  MULTIMODAL_ROUTES,
  MICROMOBILITY_HUBS,
  GTFS_VEHICLES,
  CARRIAGE_CROWDING,
  AIRPORT_EXPRESS_DATA,
  PEDESTRIAN_BRIDGES,
} from "../data";
import type { GlobalCityId } from "../types";

// 1. CCTV View
export function CctvView() {
  const [selectedCity, setSelectedCity] = useState<GlobalCityId>("tokyo");
  const [activeFeedId, setActiveFeedId] = useState<string>(CCTV_FEEDS[0].id);
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);

  const feeds = CCTV_FEEDS.filter((f) => f.city === selectedCity);
  const activeFeed = CCTV_FEEDS.find((f) => f.id === activeFeedId) || CCTV_FEEDS[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-sky-950 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
              <Video size={14} className="text-cyan-400" /> Sensor Visual CCTV Internasional
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
              Global Traffic & Pedestrian CCTV Live Stream
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Streaming real-time simulasi CCTV kota-kota global dengan deteksi objek AI (penghitung pedestrian, volume mobil, dan peringatan kemacetan).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/international"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600/80 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-cyan-500 transition"
            >
              <ArrowRight size={16} /> Semua Fitur Global
            </Link>
          </div>
        </div>
      </header>

      {/* City Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {GLOBAL_CITIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setSelectedCity(c.id);
              const cityFeeds = CCTV_FEEDS.filter((f) => f.city === c.id);
              if (cityFeeds.length > 0) setActiveFeedId(cityFeeds[0].id);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              selectedCity === c.id
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <span>{c.flag}</span>
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Video Canvas & Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col justify-between p-4">
            {/* Top Bar Video Overlay */}
            <div className="z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg bg-black/70 px-3 py-1 text-xs font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE • {activeFeed.fps} FPS • {activeFeed.latencyMs}ms LATENCY
              </div>
              <button
                type="button"
                onClick={() => setAiDetectionEnabled((prev) => !prev)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                  aiDetectionEnabled
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                AI Bounding Box: {aiDetectionEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Simulated Live Scene Center */}
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="relative h-28 w-28 rounded-full border-2 border-dashed border-cyan-500/40 flex items-center justify-center animate-spin-slow">
                <Video size={40} className="text-cyan-400" />
              </div>
              <p className="mt-4 text-sm font-bold text-white">{activeFeed.name}</p>
              <p className="text-xs text-slate-400">{activeFeed.location}</p>

              {aiDetectionEnabled && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <span className="rounded-md bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                    🚶 Pedestrian Detected: {activeFeed.pedestrianCount}
                  </span>
                  <span className="rounded-md bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                    🚗 Vehicles: {activeFeed.vehicleCount}
                  </span>
                  <span className="rounded-md bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 text-[11px] font-mono text-purple-300">
                    Kepadatan: {activeFeed.congestionLevel}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Stream Status */}
            <div className="z-10 flex items-center justify-between text-xs text-slate-400">
              <span>Feed ID: {activeFeed.id}</span>
              <span>Protokol: RTSP/WebRTC Edge Gateway</span>
            </div>
          </div>
        </div>

        {/* Camera List Sidebar */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Kamera Tersedia ({feeds.length})</h3>
          {feeds.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
              Sensor CCTV untuk kota ini sedang proses kalibrasi optik.
            </div>
          ) : (
            feeds.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFeedId(f.id)}
                className={`w-full text-left rounded-xl p-3.5 transition border ${
                  activeFeedId === f.id
                    ? "bg-cyan-950/40 border-cyan-500/50 text-white shadow"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{f.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{f.location}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 2. Traffic Congestion View
export function TrafficCongestionView() {
  const [selectedZone, setSelectedZone] = useState<string>(CONGESTION_ZONES[0].id);
  const activeZone = CONGESTION_ZONES.find((z) => z.id === selectedZone) || CONGESTION_ZONES[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/60 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
              <Car size={14} className="text-amber-400" /> Pemantauan Arus & Bottleneck Lalu Lintas
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
              Pendeteksi Macet & Rekayasa Arus Cerdas
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Analisis kecepatan rata-rata koridor arteri, estimasi keterlambatan, dan rekomendasi jalur pengalihan multimodal bagi komuter dan pejalan kaki.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Zone Selector */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Koridor Pantauan Utama</h3>
          {CONGESTION_ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedZone(z.id)}
              className={`w-full text-left rounded-xl p-4 transition border ${
                selectedZone === z.id
                  ? "bg-amber-950/40 border-amber-500/50 text-white shadow"
                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{z.corridor}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    z.level === "GRIDLOCK"
                      ? "bg-red-500/20 text-red-400"
                      : z.level === "HEAVY"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {z.level}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Kecepatan: {z.currentSpeedKmh} km/jam</span>
                <span className="text-red-400 font-bold">+{z.delayMinutes} menit</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed Insights */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{activeZone.corridor}</h2>
                <p className="text-xs text-slate-400">Status Lalu Lintas Terkini</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Keterlambatan</div>
                  <div className="text-xl font-black text-amber-400">+{activeZone.delayMinutes} min</div>
                </div>
              </div>
            </div>

            {/* Speed Comparison Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Kecepatan Aktual: {activeZone.currentSpeedKmh} km/jam</span>
                <span>Normal: {activeZone.freeFlowSpeedKmh} km/jam</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${(activeZone.currentSpeedKmh / activeZone.freeFlowSpeedKmh) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Penyebab Kemacetan:
              </span>
              <p className="text-xs leading-relaxed text-slate-300">{activeZone.bottleneckCause}</p>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 space-y-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={14} /> Rekomendasi Rute Pejalan Kaki / Bypass Multimoda:
              </span>
              <p className="text-xs leading-relaxed text-slate-200">{activeZone.suggestedDetour}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Multimodal Transit View
export function MultimodalTransitView() {
  const [activeRouteId, setActiveRouteId] = useState<string>(MULTIMODAL_ROUTES[0].id);
  const activeRoute = MULTIMODAL_ROUTES.find((r) => r.id === activeRouteId) || MULTIMODAL_ROUTES[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
          <Plane size={14} className="text-indigo-400" /> Perjalanan Lintas Moda Terpadu
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Perencana Rute Lintas Batas Global
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Koneksi mulus antarmoda transportasi internasional: kereta cepat, metro bawah tanah, jalur sepeda, dan penyeberangan pejalan kaki ramah lingkungan.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Rute Internasional Unggulan</h3>
          {MULTIMODAL_ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRouteId(r.id)}
              className={`w-full text-left rounded-xl p-4 transition border ${
                activeRouteId === r.id
                  ? "bg-indigo-950/50 border-indigo-500/50 text-white shadow"
                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              <div className="font-bold text-xs">{r.name}</div>
              <div className="text-[11px] text-slate-400 mt-1">{r.origin} ➔ {r.destination}</div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-cyan-400 font-mono">
                <span>⏱️ {r.totalDurationMin} min</span>
                <span>🌱 {r.totalCarbonKg} kg CO₂</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{activeRoute.name}</h2>
                <p className="text-xs text-slate-400">{activeRoute.origin} menuju {activeRoute.destination}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Total Tarif</span>
                  <p className="text-sm font-bold text-emerald-400">{activeRoute.totalCost}</p>
                </div>
              </div>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-4">
              {activeRoute.steps.map((s, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/40 text-xs font-bold text-indigo-300">
                      {idx + 1}
                    </span>
                    {idx < activeRoute.steps.length - 1 && <div className="h-10 w-0.5 bg-slate-800 my-1" />}
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {s.mode === "WALK" ? "🚶 Jalan Kaki" : s.mode === "RAIL" ? "🚆 Kereta JR/Express" : s.mode === "METRO" ? "🚇 MRT/Subway" : "🚲 Sepeda"}
                      </span>
                      <span className="text-[11px] text-slate-400">{s.durationMinutes} min ({s.distanceKm} km)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{s.instruction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 13. Micromobility View
export function MicromobilityView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Bike size={14} className="text-emerald-400" /> Mikromobilitas & Armada Berbagi
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Ketersediaan Sepeda & Skuter Listrik Global
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Peta sebaran dock sepeda dan e-scooter multi-operator di sekitar simpul transit, persentase sisa baterai, dan estimasi biaya per menit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MICROMOBILITY_HUBS.map((hub) => (
          <div key={hub.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4 hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono">{hub.operator}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 uppercase">{hub.city}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Unit Tersedia:</span>
              <span className="text-base font-black text-white">{hub.availableVehicles} Unit</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Rata-rata Baterai:</span>
              <span className="font-bold text-cyan-400">{hub.avgBatteryPct}%</span>
            </div>
            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 flex justify-between">
              <span>Buka Kunci: {hub.unlockCost}</span>
              <span>Tarif: {hub.perMinuteCost}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 14. GTFS Realtime View
export function GtfsRealtimeView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-slate-950 via-sky-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-500/30">
          <Train size={14} className="text-sky-400" /> GTFS Realtime Protocol
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Pelacak Posisi Bus & Kereta Live Feed
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Telemetri live armada transportasi publik dunia berbasis standar terbuka GTFS-RT dengan perkiraan keterlambatan milidetik.
        </p>
      </header>

      <div className="space-y-4">
        {GTFS_VEHICLES.map((v) => (
          <div key={v.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-xs font-bold text-sky-300 font-mono">
                  {v.routeId}
                </span>
                <span className="font-bold text-sm text-white">{v.headsign}</span>
              </div>
              <p className="text-xs text-slate-400">Pemberhentian Berikut: {v.nextStop} ({v.city.toUpperCase()})</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Estimasi Tiba</div>
                <div className="text-lg font-black text-cyan-400">{v.etaMinutes} menit</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${v.congestion === "RUNNING_ON_TIME" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                {v.congestion === "RUNNING_ON_TIME" ? "Tepat Waktu" : `Terlambat +${v.delaySeconds}s`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 33. Commuter Crowding View
export function CommuterCrowdingView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">
          <Users2 size={14} className="text-purple-400" /> Sensor Beban Gerbong Kereta
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Prediksi Kepadatan Gerbong Kereta Live
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Visualisasi kepadatan penumpang per nomor gerbong untuk membantu pejalan kaki memilih titik tunggu peron yang paling lapang.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CARRIAGE_CROWDING.map((c) => (
          <div
            key={c.carriageNumber}
            className={`rounded-2xl border p-4 text-center space-y-3 ${
              c.recommendedBoarding
                ? "border-emerald-500/50 bg-emerald-950/30 shadow-lg shadow-emerald-500/10"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            <div className="text-xs text-slate-400 font-mono">Gerbong #{c.carriageNumber}</div>
            <div className="text-xl font-black text-white">{c.passengerCountEst} Org</div>
            <span
              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                c.densityLevel === "SEATS_AVAILABLE"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : c.densityLevel === "STANDING_ROOM_ONLY"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {c.densityLevel}
            </span>
            {c.recommendedBoarding && (
              <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 size={12} /> Direkomendasikan
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 37. Pedestrian Bridges View
export function PedestrianBridgesView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-slate-950 via-teal-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300 border border-teal-500/30">
          <Layers size={14} className="text-teal-400" /> Infrastruktur Penyeberangan Tak Sebidang
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Jembatan Penyeberangan Orang & Skywalk Interkoneksi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Jaringan jembatan penyeberangan ikonik dan skywalk terlindung cuaca yang menghubungkan stasiun transit langsung ke pusat belanja.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {PEDESTRIAN_BRIDGES.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">{b.name}</h3>
              <span className="rounded bg-teal-500/20 text-teal-300 px-2 py-0.5 text-xs font-mono">{b.lengthMeters} Meter</span>
            </div>
            <p className="text-xs text-slate-400">Interkoneksi: {b.interconnectedStation}</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded px-2 py-1 ${b.hasElevator ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                🛗 Lift: {b.hasElevator ? "Tersedia" : "Tidak"}
              </span>
              <span className={`rounded px-2 py-1 ${b.isCoveredWeatherProof ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-500"}`}>
                ☂️ Pelindung Hujan: {b.isCoveredWeatherProof ? "Ada" : "Terbuka"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 41. Airport Express View
export function AirportExpressView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
          <PlaneTakeoff size={14} className="text-blue-400" /> City Airport Express Intermodal
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Hub Kereta Bandara & City Check-in Internasional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Integrasi jadwal penerbangan langsung di stasiun pusat kota, penyerahan bagasi di stasiun (in-town check-in), dan waktu tempuh presisi ke terminal bandara.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {AIRPORT_EXPRESS_DATA.map((exp) => (
          <div key={exp.airportCode} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-cyan-400 font-mono">{exp.airportCode}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 uppercase">{exp.city}</span>
            </div>
            <h3 className="font-bold text-sm text-white">{exp.trainName}</h3>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Waktu Tempuh:</span>
                <span className="font-bold text-white">{exp.travelTimeMinutes} Menit</span>
              </div>
              <div className="flex justify-between">
                <span>Frekuensi:</span>
                <span>Tiap {exp.frequencyMinutes} Menit</span>
              </div>
              <div className="flex justify-between">
                <span>Tarif Tiket:</span>
                <span className="font-bold text-emerald-400">{exp.fareAmount}</span>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-3 text-[11px]">
              <span className={`inline-block rounded px-2 py-0.5 ${exp.hasLuggageCheckin ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                🧳 City Check-in: {exp.hasLuggageCheckin ? "Tersedia" : "Hanya di Bandara"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
