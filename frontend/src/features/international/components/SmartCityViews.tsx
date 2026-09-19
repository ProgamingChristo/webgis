"use client";

import { useState } from "react";
import {
  ParkingCircle,
  Zap,
  Footprints,
  Box,
  ScanLine,
  Radio,
  Wifi,
  Lightbulb,
  Maximize2,
  Activity,
  Map,
  CheckCircle2,
} from "lucide-react";
import {
  SMART_PARKING_LOTS,
  EV_CHARGING_HUBS,
  WALK_SCORES,
  DIGITAL_TWIN_MODELS,
  ROAD_DEFECTS,
  DRONE_CORRIDORS,
  PUBLIC_WIFI_SPOTS,
  STREET_LIGHTING_POLES,
  CURBSIDE_ZONES,
  PEDESTRIAN_FLOW_MODELS,
  OPEN_BASEMAP_PROVIDERS,
} from "../data";

// 7. Smart Parking View
export function SmartParkingView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
          <ParkingCircle size={14} className="text-cyan-400" /> Sensor Parkir & Okupansi Cerdas
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Sensor Parkir Cerdas & Okupansi Tepi Jalan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Informasi real-time slot parkir kosong, slot khusus kendaraan listrik (EV), dan akses parkir penyandang disabilitas di dekat simpul transit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {SMART_PARKING_LOTS.map((lot) => (
          <div key={lot.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{lot.name}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase">{lot.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Slot Kosong:</span>
              <span className="text-3xl font-black text-emerald-400">{lot.availableSpots} <span className="text-xs text-slate-400 font-normal">/ {lot.totalSpots}</span></span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div>⚡ EV: <span className="font-bold text-cyan-400">{lot.evChargingSpots} slot</span></div>
              <div>♿ Difabel: <span className="font-bold text-cyan-400">{lot.disabledSpots} slot</span></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tarif: {lot.hourlyRate}</span>
              <span className="text-amber-400 font-bold">{lot.occupancyTrend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 8. EV Charging View
export function EvChargingView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Zap size={14} className="text-emerald-400" /> Infrastruktur Kendaraan Listrik Bersih
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Stasiun Pengisian Kendaraan Listrik (EV)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Jaringan SPKLU ultra-fast charging, tipe konektor (CCS2, CHAdeMO, Type2), kapasitas daya kW, dan tarif pengisian daya.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {EV_CHARGING_HUBS.map((hub) => (
          <div key={hub.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{hub.name}</span>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">{hub.powerKw} kW</span>
            </div>
            <p className="text-xs text-slate-400">Operator: {hub.operator} ({hub.city.toUpperCase()})</p>
            <div className="space-y-2 border-t border-slate-800 pt-3">
              {hub.plugs.map((p, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300">
                  <span>{p.type}:</span>
                  <span className="font-bold text-emerald-400">{p.available} / {p.total} Tersedia</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 flex justify-between border-t border-slate-800 pt-2">
              <span>Tarif: {hub.pricePerKwh}</span>
              <span className="text-emerald-400 font-bold">{hub.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 15. Walk Score View
export function WalkScoreView() {
  const [activeScoreIdx, setActiveScoreIdx] = useState(0);
  const current = WALK_SCORES[activeScoreIdx] || WALK_SCORES[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Footprints size={14} className="text-emerald-400" /> Konsep Kota 15 Menit (15-Minute City)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Kalkulator Walk Score Internasional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Skor kelayakan jalan kaki (0 - 100) berdasarkan ketersediaan fasilitas kebutuhan hidup harian dalam radius jangkauan kaki.
        </p>
      </header>

      <div className="flex gap-2">
        {WALK_SCORES.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveScoreIdx(idx)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition border ${
              activeScoreIdx === idx
                ? "bg-emerald-500 text-slate-950 border-emerald-500"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            {s.address}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{current.address}</h2>
            <p className="text-xs text-slate-400">Klasifikasi: {current.tier.replace("_", " ")}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Walk Score</div>
            <div className="text-4xl font-black text-emerald-400">{current.score} / 100</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {current.amenitiesBreakdown.map((a, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <span className="text-xs text-slate-400">{a.category}</span>
              <div className="text-2xl font-black text-cyan-400">{a.score}</div>
              <p className="text-[11px] text-slate-300">{a.countNearby} Fasilitas dalam Walkshead</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 20. Digital Twin 3D View
export function DigitalTwinView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">
          <Box size={14} className="text-purple-400" /> CityGML & LoD2 Ekstrusi Bangunan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Digital Twin 3D & Potensi Rooftop Surya
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Visualisasi spasial 3 dimensi bentuk bangunan kota, ketinggian fasad arsitektur, dan kalkulasi potensi tenaga surya atap (solar rooftop).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DIGITAL_TWIN_MODELS.map((m) => (
          <div key={m.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{m.district}</h3>
              <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-xs font-mono">{m.lodLevel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div>Jumlah Gedung: <p className="text-lg font-bold text-white">{m.buildingCount}</p></div>
              <div>Rata-rata Tinggi: <p className="text-lg font-bold text-cyan-400">{m.avgHeightMeters}m</p></div>
              <div>Potensi Surya: <p className="text-lg font-bold text-amber-400">{m.solarRooftopPotentialGwh} GWh</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 21. Road Damage AI View
export function RoadDamageAiView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-slate-950 via-red-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
          <ScanLine size={14} className="text-red-400" /> Computer Vision Inspection
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Inspeksi Kerusakan Jalan & Trotoar AI
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Deteksi otomatis lubang aspal, retak buaya (alligator cracking), dan penutup utilitas berbahaya menggunakan model Computer Vision.
        </p>
      </header>

      <div className="space-y-4">
        {ROAD_DEFECTS.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-500/20 text-red-300 px-2 py-0.5 text-xs font-bold">{d.defectType}</span>
                <span className="font-bold text-sm text-white">{d.location}</span>
              </div>
              <p className="text-xs text-slate-400">Tingkat Keparahan: {d.severity} • Confidence: {(d.confidenceScore * 100).toFixed(0)}%</p>
            </div>
            <div>
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-amber-500/20 text-amber-300">
                {d.repairStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 22. Drone Corridor View
export function DroneCorridorsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-slate-950 via-sky-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-500/30">
          <Radio size={14} className="text-sky-400" /> Urban Air Mobility (UAM)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Koridor Logistik Drone & Zona Udara Rendah
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Rute penerbangan UAV kargo medis dan logistik cepat di atas koridor sungai dan jalan tol tanpa membahayakan warga di darat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DRONE_CORRIDORS.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white">{c.corridorName}</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Batas Ketinggian:</span>
              <span className="font-bold text-cyan-400">{c.minAltitudeMeters}m - {c.maxAltitudeMeters}m</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Kelas Ruang Udara:</span>
              <span className="font-mono text-purple-300">{c.airspaceClass}</span>
            </div>
            <p className="text-xs text-slate-400">Drone Aktif Saat Ini: {c.currentTrafficUav} UAV</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 26. Public Wi-Fi View
export function PublicWifiView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
          <Wifi size={14} className="text-cyan-400" /> Inklusi Digital & Konektivitas Warga
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Jaringan Wi-Fi Publik & Kios Internet Kota
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Titik akses internet nirkabel gratis di stasiun, halte, taman terbuka, dan sentra kuliner UMKM.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PUBLIC_WIFI_SPOTS.map((w) => (
          <div key={w.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white">{w.ssid}</span>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-mono">{w.speedMbps} Mbps</span>
            </div>
            <p className="text-xs text-slate-400">Lokasi: {w.location} ({w.city.toUpperCase()})</p>
            <div className="flex justify-between text-xs text-slate-300 border-t border-slate-800 pt-2">
              <span>Status: <strong className="text-emerald-400">{w.status}</strong></span>
              <span>Akses: {w.isFree ? "Gratis Warga" : "Berbayar"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 31. Street Lighting View
export function StreetLightingView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-slate-950 via-yellow-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300 border border-yellow-500/30">
          <Lightbulb size={14} className="text-yellow-400" /> Smart Lighting Telemetry
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Jaringan Penerangan Jalan Cerdas (Smart PJU)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Pengukuran intensitas pencahayaan lux, efisiensi energi tiang lampu tenaga surya, dan perbaikan titik gelap jalan kaki.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {STREET_LIGHTING_POLES.map((pole) => (
          <div key={pole.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white font-mono">{pole.poleNumber}</span>
              <span className="rounded bg-yellow-500/20 text-yellow-300 px-2 py-0.5 text-xs">{pole.illuminanceLux} Lux</span>
            </div>
            <p className="text-xs text-slate-400">Keluaran: {pole.lumensOutput} Lumens • Status: {pole.status}</p>
            <p className="text-xs text-emerald-400">Daya: {pole.solarPowered ? "Panel Surya + Baterai" : "Jaringan Listrik PLN"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 35. Curbside Management View
export function CurbsideManagementView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
          <Maximize2 size={14} className="text-indigo-400" /> Fleksibilitas Ruang Jalan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Manajemen Dinamis Tepi Jalan (Curbside Allocation)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Alokasi ruang tepi jalan fleksibel: tempat bongkar muat komersial pagi, parklet kuliner sore, dan titik jemput ride-hailing malam.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CURBSIDE_ZONES.map((z) => (
          <div key={z.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white">{z.street}</span>
              <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs">{z.activeMode}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Tarif Dinamis: ${z.ratePerHourUsd}/jam</span>
              <span>Okupansi: {z.occupancyPct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 42. Pedestrian Flow AI View
export function PedestrianFlowAiView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
          <Activity size={14} className="text-cyan-400" /> Crowd Dynamics Simulation
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Simulator Dinamika Arus Pejalan Kaki
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Model AI simulasi mikroskopis aliran pejalan kaki, mitigasi penyempitan di tangga stasiun, dan kecepatan langkah aman.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PEDESTRIAN_FLOW_MODELS.map((m) => (
          <div key={m.nodeId} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white">{m.nodeId}</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Kapasitas Aliran:</span>
              <span className="font-bold text-cyan-400">{m.pedestriansPerMinute} orang/menit</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Kecepatan Langkah:</span>
              <span>{m.flowVelocityMps} m/detik</span>
            </div>
            <div className="text-xs text-slate-400">Rating Kepadatan: <span className="text-amber-400 font-bold">{m.socialDensityRating}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 50. Open Basemaps View
export function OpenBasemapsView() {
  const [selectedBasemap, setSelectedBasemap] = useState<string>(OPEN_BASEMAP_PROVIDERS[0].id);
  const currentProvider = OPEN_BASEMAP_PROVIDERS.find((p) => p.id === selectedBasemap) || OPEN_BASEMAP_PROVIDERS[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-slate-950 via-sky-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-500/30">
          <Map size={14} className="text-sky-400" /> Multi-Engine Vector & Raster Switcher
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Universal Multi-Engine Basemap Switcher
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Bebas beralih penyedia peta dasar kelas dunia: OpenStreetMap, Carto Dark Matter, Positron Light, dan Esri Satellite tanpa terikat satu vendor.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {OPEN_BASEMAP_PROVIDERS.map((bp) => (
          <button
            key={bp.id}
            type="button"
            onClick={() => setSelectedBasemap(bp.id)}
            className={`text-left rounded-2xl border p-5 transition space-y-3 ${
              selectedBasemap === bp.id
                ? "border-cyan-500 bg-cyan-950/40 shadow-xl shadow-cyan-500/20 text-white"
                : "border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">{bp.provider}</span>
              {selectedBasemap === bp.id && <CheckCircle2 size={16} className="text-cyan-400" />}
            </div>
            <h3 className="font-bold text-sm text-white">{bp.name}</h3>
            <p className="text-[11px] text-slate-400 font-mono truncate">{bp.tileUrl}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <h3 className="font-bold text-base text-white">Peta Aktif: {currentProvider.name}</h3>
        <p className="text-xs text-slate-300">Attribution: {currentProvider.attribution}</p>
        <p className="text-xs text-cyan-300">Max Zoom: {currentProvider.maxZoom} • Tema Rekomendasi: {currentProvider.isDarkThemeRecommended ? "Dark Spatial" : "Light Minimalist"}</p>
      </div>
    </div>
  );
}
