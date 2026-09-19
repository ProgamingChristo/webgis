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
import { CctvLivePlayer } from "./CctvLivePlayer";

// 1. CCTV View
export function CctvView() {
  const [selectedCity, setSelectedCity] = useState<GlobalCityId>("tokyo");
  const [activeFeedId, setActiveFeedId] = useState<string>(CCTV_FEEDS[0].id);
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);

  const feeds = CCTV_FEEDS.filter((f) => f.city === selectedCity);
  const activeFeed = CCTV_FEEDS.find((f) => f.id === activeFeedId) || CCTV_FEEDS[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
              <Video size={14} className="text-[#118ab2]" /> Sensor Visual CCTV Internasional
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
              Global Traffic & Pedestrian CCTV Live Stream
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#66708d]">
              Streaming video interaktif 60 FPS CCTV megacity dunia dengan machine vision AI (penghitung pejalan kaki scramble, volume kendaraan, dan deteksi kemacetan real-time).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/international"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#118ab2] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0d7495] transition"
            >
              <ArrowRight size={16} /> Katalog 50 Fitur
            </Link>
          </div>
        </div>
      </header>

      {/* City Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#464b71]/10 pb-3">
        {GLOBAL_CITIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setSelectedCity(c.id);
              const cityFeeds = CCTV_FEEDS.filter((f) => f.city === c.id);
              if (cityFeeds.length > 0) setActiveFeedId(cityFeeds[0].id);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition border ${
              selectedCity === c.id
                ? "bg-[#118ab2] text-white shadow-sm border-[#118ab2]"
                : "bg-white text-[#464b71] hover:bg-[#f0f9ff] border-[#464b71]/15"
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
          {/* Active Canvas Video Player */}
          <CctvLivePlayer
            feed={activeFeed}
            aiDetection={aiDetectionEnabled}
            onToggleAi={() => setAiDetectionEnabled((prev) => !prev)}
          />

          {/* AI Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[#464b71]/15 bg-white p-4 shadow-[0_4px_12px_rgba(70,75,113,0.04)]">
              <span className="text-[11px] font-bold text-[#66708d] uppercase">🚶 Pedestrian Detected</span>
              <p className="mt-1 text-xl font-black text-[#118ab2]">{activeFeed.pedestrianCount} Orang</p>
              <span className="text-[10px] text-emerald-600 font-bold">Terhitung AI YOLO</span>
            </div>
            <div className="rounded-2xl border border-[#464b71]/15 bg-white p-4 shadow-[0_4px_12px_rgba(70,75,113,0.04)]">
              <span className="text-[11px] font-bold text-[#66708d] uppercase">🚗 Volume Mobil</span>
              <p className="mt-1 text-xl font-black text-[#464b71]">{activeFeed.vehicleCount} Unit</p>
              <span className="text-[10px] text-sky-600 font-bold">Jalan Terpantau</span>
            </div>
            <div className="rounded-2xl border border-[#464b71]/15 bg-white p-4 shadow-[0_4px_12px_rgba(70,75,113,0.04)]">
              <span className="text-[11px] font-bold text-[#66708d] uppercase">🚦 Status Arus</span>
              <p className="mt-1 text-xl font-black text-amber-600">{activeFeed.congestionLevel}</p>
              <span className="text-[10px] text-slate-500 font-bold">{activeFeed.fps} FPS · {activeFeed.latencyMs}ms</span>
            </div>
          </div>
        </div>

        {/* Camera List Sidebar */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-[#464b71]">Kamera CCTV Tersedia ({feeds.length})</h3>
          {feeds.length === 0 ? (
            <div className="rounded-2xl border border-[#464b71]/15 bg-white p-6 text-center text-xs text-[#66708d]">
              Sensor CCTV untuk kota ini sedang proses kalibrasi optik.
            </div>
          ) : (
            feeds.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFeedId(f.id)}
                className={`w-full text-left rounded-2xl p-4 transition border ${
                  activeFeedId === f.id
                    ? "bg-[#f0f9ff] border-[#118ab2] text-[#464b71] shadow-sm ring-1 ring-[#118ab2]"
                    : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#464b71]">{f.name}</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-[#66708d] mt-1">{f.location}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#118ab2] font-semibold">
                  <span>{f.resolution || "1080p@60fps"}</span>
                  <span>{f.protocol || "RTSP/WebRTC Gateway"}</span>
                </div>
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
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
              <Car size={14} className="text-amber-600" /> Pemantauan Arus & Bottleneck Lalu Lintas
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
              Pendeteksi Macet & Rekayasa Arus Cerdas
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#66708d]">
              Analisis kecepatan rata-rata koridor arteri, estimasi keterlambatan, dan rekomendasi jalur pengalihan multimodal bagi komuter dan pejalan kaki.
            </p>
          </div>
          <Link
            href="/international"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#118ab2] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0d7495] transition self-start md:self-auto"
          >
            <ArrowRight size={16} /> Semua Modul
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Zone Selector */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-[#464b71]">Koridor Pantauan Utama</h3>
          {CONGESTION_ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedZone(z.id)}
              className={`w-full text-left rounded-2xl p-4 transition border ${
                selectedZone === z.id
                  ? "bg-[#f0f9ff] border-[#118ab2] shadow-sm text-[#464b71] ring-1 ring-[#118ab2]"
                  : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-[#464b71]">{z.corridor}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    z.level === "GRIDLOCK"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : z.level === "HEAVY"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                  }`}
                >
                  {z.level}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#66708d]">
                <span>Kecepatan: {z.currentSpeedKmh} km/jam</span>
                <span className="text-red-600 font-bold">+{z.delayMinutes} menit</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed Insights */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#464b71]/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-[#464b71]">{activeZone.corridor}</h2>
                <p className="text-xs text-[#66708d]">Status Lalu Lintas Terkini</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-[#66708d]">Keterlambatan</div>
                  <div className="text-xl font-black text-red-600">+{activeZone.delayMinutes} min</div>
                </div>
              </div>
            </div>

            {/* Speed Comparison Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#464b71] font-semibold">
                <span>Kecepatan Aktual: {activeZone.currentSpeedKmh} km/jam</span>
                <span className="text-[#66708d]">Bebas Hambatan: {activeZone.freeFlowSpeedKmh} km/jam</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${(activeZone.currentSpeedKmh / activeZone.freeFlowSpeedKmh) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-1.5">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" /> Faktor Hambatan:
              </span>
              <p className="text-xs leading-relaxed text-amber-950">{activeZone.bottleneckCause}</p>
            </div>

            <div className="rounded-2xl border border-[#118ab2]/25 bg-[#f0f9ff] p-4 space-y-1.5">
              <span className="text-xs font-bold text-[#118ab2] flex items-center gap-1.5">
                <Sparkles size={14} /> Rekomendasi Rute Pejalan Kaki / Bypass Multimoda:
              </span>
              <p className="text-xs leading-relaxed text-[#464b71]">{activeZone.suggestedDetour}</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Plane size={14} className="text-[#118ab2]" /> Perjalanan Lintas Moda Terpadu
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Perencana Rute Lintas Batas Global
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Koneksi mulus antarmoda transportasi internasional: kereta cepat, metro bawah tanah, jalur sepeda, dan penyeberangan pejalan kaki ramah lingkungan.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <h3 className="text-sm font-black text-[#464b71]">Rute Internasional Unggulan</h3>
          {MULTIMODAL_ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRouteId(r.id)}
              className={`w-full text-left rounded-2xl p-4 transition border ${
                activeRouteId === r.id
                  ? "bg-[#f0f9ff] border-[#118ab2] text-[#464b71] shadow-sm ring-1 ring-[#118ab2]"
                  : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
              }`}
            >
              <div className="font-black text-xs text-[#464b71]">{r.name}</div>
              <div className="text-[11px] text-[#66708d] mt-1">{r.origin} ➔ {r.destination}</div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#118ab2] font-bold">
                <span>⏱️ {r.totalDurationMin} min</span>
                <span>🌱 {r.totalCarbonKg} kg CO₂</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#464b71]/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-[#464b71]">{activeRoute.name}</h2>
                <p className="text-xs text-[#66708d]">{activeRoute.origin} menuju {activeRoute.destination}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-[#66708d] uppercase font-bold">Total Tarif</span>
                  <p className="text-sm font-black text-emerald-600">{activeRoute.totalCost}</p>
                </div>
              </div>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-4">
              {activeRoute.steps.map((s, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#118ab2]/10 border border-[#118ab2]/30 text-xs font-bold text-[#118ab2]">
                      {idx + 1}
                    </span>
                    {idx < activeRoute.steps.length - 1 && <div className="h-10 w-0.5 bg-slate-200 my-1" />}
                  </div>
                  <div className="flex-1 rounded-2xl border border-[#464b71]/10 bg-[#f8fafc] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#464b71] flex items-center gap-1.5">
                        {s.mode === "WALK" ? "🚶 Jalan Kaki" : s.mode === "RAIL" ? "🚆 Kereta JR/Express" : s.mode === "METRO" ? "🚇 MRT/Subway" : "🚲 Sepeda"}
                      </span>
                      <span className="text-[11px] text-[#66708d]">{s.durationMinutes} min ({s.distanceKm} km)</span>
                    </div>
                    <p className="text-xs text-[#464b71] mt-1">{s.instruction}</p>
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
      <header className="rounded-3xl border border-[#62d6c8]/30 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Bike size={14} className="text-emerald-600" /> Mikromobilitas & Armada Berbagi
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Ketersediaan Sepeda & Skuter Listrik Global
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Peta sebaran dock sepeda dan e-scooter multi-operator di sekitar simpul transit, persentase sisa baterai, dan estimasi biaya per menit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MICROMOBILITY_HUBS.map((hub) => (
          <div key={hub.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-5 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4 hover:border-[#118ab2]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#118ab2] font-mono">{hub.operator}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#464b71] uppercase">{hub.city}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#66708d]">
              <span>Unit Tersedia:</span>
              <span className="text-base font-black text-[#464b71]">{hub.availableVehicles} Unit</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#66708d]">
              <span>Rata-rata Baterai:</span>
              <span className="font-bold text-emerald-600">{hub.avgBatteryPct}%</span>
            </div>
            <div className="border-t border-[#464b71]/10 pt-3 text-[11px] text-[#66708d] flex justify-between">
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Train size={14} className="text-[#118ab2]" /> GTFS Realtime Protocol
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Pelacak Posisi Bus & Kereta Live Feed
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Telemetri live armada transportasi publik dunia berbasis standar terbuka GTFS-RT dengan perkiraan keterlambatan milidetik.
        </p>
      </header>

      <div className="space-y-4">
        {GTFS_VEHICLES.map((v) => (
          <div key={v.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#118ab2]/10 border border-[#118ab2]/30 px-2.5 py-0.5 text-xs font-bold text-[#118ab2] font-mono">
                  {v.routeId}
                </span>
                <span className="font-bold text-sm text-[#464b71]">{v.headsign}</span>
              </div>
              <p className="text-xs text-[#66708d]">Pemberhentian Berikut: {v.nextStop} ({v.city.toUpperCase()})</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-[#66708d]">Estimasi Tiba</div>
                <div className="text-lg font-black text-[#118ab2]">{v.etaMinutes} menit</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${v.congestion === "RUNNING_ON_TIME" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Users2 size={14} className="text-[#118ab2]" /> Sensor Beban Gerbong Kereta
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Prediksi Kepadatan Gerbong Kereta Live
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Visualisasi kepadatan penumpang per nomor gerbong untuk membantu pejalan kaki memilih titik tunggu peron yang paling lapang.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CARRIAGE_CROWDING.map((c) => (
          <div
            key={c.carriageNumber}
            className={`rounded-3xl border p-4 text-center space-y-3 shadow-sm ${
              c.recommendedBoarding
                ? "border-emerald-300 bg-emerald-50/70"
                : "border-[#464b71]/15 bg-white"
            }`}
          >
            <div className="text-xs text-[#66708d] font-mono">Gerbong #{c.carriageNumber}</div>
            <div className="text-xl font-black text-[#464b71]">{c.passengerCountEst} Org</div>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                c.densityLevel === "SEATS_AVAILABLE"
                  ? "bg-emerald-100 text-emerald-800"
                  : c.densityLevel === "STANDING_ROOM_ONLY"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {c.densityLevel}
            </span>
            {c.recommendedBoarding && (
              <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 size={12} /> Disarankan
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Layers size={14} className="text-[#118ab2]" /> Infrastruktur Penyeberangan Tak Sebidang
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Jembatan Penyeberangan Orang & Skywalk Interkoneksi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Jaringan jembatan penyeberangan ikonik dan skywalk terlindung cuaca yang menghubungkan stasiun transit langsung ke pusat belanja.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {PEDESTRIAN_BRIDGES.map((b) => (
          <div key={b.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#464b71]">{b.name}</h3>
              <span className="rounded-full bg-[#118ab2]/10 text-[#118ab2] px-3 py-0.5 text-xs font-mono font-bold">{b.lengthMeters} Meter</span>
            </div>
            <p className="text-xs text-[#66708d]">Interkoneksi: {b.interconnectedStation}</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded-full px-2.5 py-1 font-bold ${b.hasElevator ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                🛗 Lift: {b.hasElevator ? "Tersedia" : "Tidak"}
              </span>
              <span className={`rounded-full px-2.5 py-1 font-bold ${b.isCoveredWeatherProof ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-500"}`}>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <PlaneTakeoff size={14} className="text-[#118ab2]" /> City Airport Express Intermodal
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Hub Kereta Bandara & City Check-in Internasional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Integrasi jadwal penerbangan langsung di stasiun pusat kota, penyerahan bagasi di stasiun (in-town check-in), dan waktu tempuh presisi ke terminal bandara.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {AIRPORT_EXPRESS_DATA.map((exp) => (
          <div key={exp.airportCode} className="rounded-3xl border border-[#464b71]/15 bg-white p-5 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-[#118ab2] font-mono">{exp.airportCode}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-[#464b71] font-bold uppercase">{exp.city}</span>
            </div>
            <h3 className="font-bold text-sm text-[#464b71]">{exp.trainName}</h3>
            <div className="space-y-1 text-xs text-[#66708d]">
              <div className="flex justify-between">
                <span>Waktu Tempuh:</span>
                <span className="font-bold text-[#464b71]">{exp.travelTimeMinutes} Menit</span>
              </div>
              <div className="flex justify-between">
                <span>Frekuensi:</span>
                <span>Tiap {exp.frequencyMinutes} Menit</span>
              </div>
              <div className="flex justify-between">
                <span>Tarif Tiket:</span>
                <span className="font-bold text-emerald-600">{exp.fareAmount}</span>
              </div>
            </div>
            <div className="border-t border-[#464b71]/10 pt-3 text-[11px]">
              <span className={`inline-block rounded-full px-2.5 py-0.5 font-bold ${exp.hasLuggageCheckin ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                🧳 City Check-in: {exp.hasLuggageCheckin ? "Tersedia" : "Hanya di Bandara"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
