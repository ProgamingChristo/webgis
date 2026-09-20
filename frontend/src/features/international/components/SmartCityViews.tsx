"use client";
import { GlobalDataCenter } from "./GlobalDataCenter";

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
} from "../data";

// 7. Smart Parking View
export function SmartParkingView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <ParkingCircle size={14} className="text-[#118ab2]" /> Sensor Parkir & Okupansi Cerdas
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Sensor Parkir Cerdas & Okupansi Tepi Jalan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Informasi real-time slot parkir kosong, slot khusus kendaraan listrik (EV), dan akses parkir penyandang disabilitas di dekat simpul transit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {SMART_PARKING_LOTS.map((lot) => (
          <div key={lot.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[#464b71]">{lot.name}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#66708d] uppercase">{lot.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#66708d]">Slot Kosong:</span>
              <span className="text-3xl font-black text-emerald-700">{lot.availableSpots} <span className="text-xs text-[#66708d] font-normal">/ {lot.totalSpots}</span></span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#464b71] border-t border-[#464b71]/10 pt-3">
              <div>⚡ EV: <span className="font-bold text-[#118ab2]">{lot.evChargingSpots} slot</span></div>
              <div>♿ Difabel: <span className="font-bold text-[#118ab2]">{lot.disabledSpots} slot</span></div>
            </div>
            <div className="flex justify-between text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">
              <span>Tarif: {lot.hourlyRate}</span>
              <span className="text-amber-700 font-bold">{lot.occupancyTrend}</span>
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
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Zap size={14} className="text-emerald-600" /> Infrastruktur Kendaraan Listrik Bersih
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Stasiun Pengisian Kendaraan Listrik (EV)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Jaringan SPKLU ultra-fast charging, tipe konektor (CCS2, CHAdeMO, Type2), kapasitas daya kW, dan tarif pengisian daya.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {EV_CHARGING_HUBS.map((hub) => (
          <div key={hub.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[#464b71]">{hub.name}</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">{hub.powerKw} kW</span>
            </div>
            <p className="text-xs text-[#66708d]">Operator: {hub.operator} ({hub.city.toUpperCase()})</p>
            <div className="space-y-2 border-t border-[#464b71]/10 pt-3">
              {hub.plugs.map((p, idx) => (
                <div key={idx} className="flex justify-between text-xs text-[#464b71]">
                  <span>{p.type}:</span>
                  <span className="font-bold text-emerald-700">{p.available} / {p.total} Tersedia</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-[#66708d] flex justify-between border-t border-[#464b71]/10 pt-2">
              <span>Tarif: {hub.pricePerKwh}</span>
              <span className="text-emerald-700 font-bold">{hub.status}</span>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
            <Footprints size={14} className="text-[#118ab2]" /> Konsep Kota 15 Menit (15-Minute City)
          </span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-black">
            GETRA WALKABILITY INDEX
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Kalkulator Walk Score Internasional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Skor kelayakan jalan kaki (0 - 100) berdasarkan 9 komponen GIS: aksesibilitas jaringan jalan, densitas POI, jaringan pedestrian, penyeberangan, kemiringan lereng, trotoar, peneduh kanopi, aksesibilitas difabel, dan kedekatan transit. <em>GIS menghitung. AI menginterpretasikan.</em>
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {WALK_SCORES.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveScoreIdx(idx)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition border ${
              activeScoreIdx === idx
                ? "bg-[#118ab2] text-white border-[#118ab2] shadow-sm"
                : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
            }`}
          >
            {s.address}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#464b71]/10 pb-4">
          <div>
            <h2 className="text-lg font-black text-[#464b71]">{current.address}</h2>
            <p className="text-xs text-[#66708d]">Klasifikasi: {current.tier.replace("_", " ")}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#66708d]">Total Walkability Score</div>
            <div className="text-4xl font-black text-emerald-700">{current.score} / 100</div>
          </div>
        </div>

        {/* GIS Components */}
        {current.gisComponents && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#464b71]">
              Komponen Kalkulasi GIS (Bukan Proprietary Blackbox)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <span className="text-[10px] text-[#66708d]">Jaringan Jalan</span>
                <p className="text-base font-black text-[#118ab2]">{current.gisComponents.networkDensity}/100</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <span className="text-[10px] text-[#66708d]">Keselamatan Zebra</span>
                <p className="text-base font-black text-[#118ab2]">{current.gisComponents.crossingSafety}/100</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <span className="text-[10px] text-[#66708d]">Kontinuitas Trotoar</span>
                <p className="text-base font-black text-[#118ab2]">{current.gisComponents.sidewalkContinuity}/100</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <span className="text-[10px] text-[#66708d]">Kenyamanan Kontur</span>
                <p className="text-base font-black text-emerald-700">{current.gisComponents.slopeComfort}/100</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <span className="text-[10px] text-[#66708d]">Kedekatan Transit</span>
                <p className="text-base font-black text-[#118ab2]">{current.gisComponents.transitProximity}/100</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#464b71]">
            Ketersediaan Fasilitas Kebutuhan Harian (Walkshed)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {current.amenitiesBreakdown.map((a, idx) => (
              <div key={idx} className="rounded-2xl border border-[#464b71]/10 bg-[#f8fafc] p-4 space-y-2">
                <span className="text-xs font-bold text-[#66708d]">{a.category}</span>
                <div className="text-2xl font-black text-[#118ab2]">{a.score}</div>
                <p className="text-[11px] text-[#464b71]">{a.countNearby} Fasilitas dalam Walkshead</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 20. Digital Twin 3D View
export function DigitalTwinView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-white via-[#faf5ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3.5 py-1 text-xs font-bold text-purple-700 border border-purple-500/20">
          <Box size={14} className="text-purple-600" /> CityGML & LoD2 Ekstrusi Bangunan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Digital Twin 3D & Potensi Rooftop Surya
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Visualisasi spasial 3 dimensi bentuk bangunan kota, ketinggian fasad arsitektur, dan kalkulasi potensi tenaga surya atap (solar rooftop).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DIGITAL_TWIN_MODELS.map((m) => (
          <div key={m.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{m.district}</h3>
              <span className="rounded-full bg-purple-100 text-purple-800 px-3 py-0.5 text-xs font-mono font-bold">{m.lodLevel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <div>Jumlah Gedung: <p className="text-lg font-black text-[#464b71]">{m.buildingCount}</p></div>
              <div>Rata-rata Tinggi: <p className="text-lg font-black text-[#118ab2]">{m.avgHeightMeters}m</p></div>
              <div>Potensi Surya: <p className="text-lg font-black text-amber-600">{m.solarRooftopPotentialGwh} GWh</p></div>
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
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
            <ScanLine size={14} className="text-rose-600" /> Computer Vision Inspection
          </span>
          <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-bold">
            AI DETECTS • ADMIN VERIFIES
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Inspeksi Kerusakan Jalan & Trotoar AI
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Deteksi otomatis lubang aspal, retak buaya (alligator cracking), dan penutup utilitas berbahaya menggunakan model Computer Vision dengan verifikasi admin sebelum dispatch perbaikan.
        </p>
      </header>

      {/* Pipeline Status */}
      <div className="rounded-2xl border border-[#464b71]/10 bg-[#f8fafc] p-4 text-xs text-[#464b71] flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">Pipeline Deteksi:</span>
        <span className="font-mono text-[#66708d]">IMAGE ➔ CV DETECTION ➔ GIS LOCATION ➔ CONFIDENCE EVALUATION ➔ ADMIN VERIFICATION</span>
      </div>

      <div className="space-y-4">
        {ROAD_DEFECTS.map((d) => (
          <div key={d.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-xs font-bold">{d.defectType}</span>
                <span className="font-black text-sm text-[#464b71]">{d.location}</span>
              </div>
              <p className="text-xs text-[#66708d]">Tingkat Keparahan: {d.severity} • Confidence: {(d.confidenceScore * 100).toFixed(0)}% • Evidence: Verified Frame</p>
            </div>
            <div>
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800">
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
            <Radio size={14} className="text-[#118ab2]" /> Urban Air Mobility (UAM)
          </span>
          <span className="rounded-full bg-purple-100 text-purple-800 px-3 py-1 text-xs font-bold">
            DATA REGULATOR RESMI
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Koridor Logistik Drone & Zona Udara Rendah
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Rute penerbangan UAV kargo medis dan logistik cepat di atas koridor sungai dan jalan tol tanpa membahayakan warga di darat.
        </p>
      </header>

      {/* Regulatory Notice */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-[#66708d] flex items-center gap-2">
        <span className="font-bold text-slate-700">Notice Regulasi Penerbangan:</span>
        <span>Hanya menampilkan koridor yang ditetapkan otoritas penerbangan sipil. Tidak menyatakan izin terbang otomatis tanpa NOTAM resmi.</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DRONE_CORRIDORS.map((c) => (
          <div key={c.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <h3 className="font-black text-sm text-[#464b71]">{c.corridorName}</h3>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Batas Ketinggian:</span>
              <span className="font-bold text-[#118ab2]">{c.minAltitudeMeters}m - {c.maxAltitudeMeters}m</span>
            </div>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Kelas Ruang Udara:</span>
              <span className="font-mono font-bold text-purple-700">{c.airspaceClass}</span>
            </div>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">Drone Aktif Saat Ini: {c.currentTrafficUav} UAV</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Wifi size={14} className="text-[#118ab2]" /> Inklusi Digital & Konektivitas Warga
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Jaringan Wi-Fi Publik & Kios Internet Kota
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Titik akses internet nirkabel gratis di stasiun, halte, taman terbuka, dan sentra kuliner UMKM.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PUBLIC_WIFI_SPOTS.map((w) => (
          <div key={w.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#464b71]">{w.ssid}</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-mono font-bold">{w.speedMbps} Mbps</span>
            </div>
            <p className="text-xs text-[#66708d]">Lokasi: {w.location} ({w.city.toUpperCase()})</p>
            <div className="flex justify-between text-xs text-[#464b71] border-t border-[#464b71]/10 pt-2 font-medium">
              <span>Status: <strong className="text-emerald-700">{w.status}</strong></span>
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
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <Lightbulb size={14} className="text-amber-600" /> Smart Lighting Telemetry
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Jaringan Penerangan Jalan Cerdas (Smart PJU)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Pengukuran intensitas pencahayaan lux, efisiensi energi tiang lampu tenaga surya, dan perbaikan titik gelap jalan kaki.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {STREET_LIGHTING_POLES.map((pole) => (
          <div key={pole.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#464b71] font-mono">{pole.poleNumber}</span>
              <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-bold">{pole.illuminanceLux} Lux</span>
            </div>
            <p className="text-xs text-[#66708d]">Keluaran: {pole.lumensOutput} Lumens • Status: {pole.status}</p>
            <p className="text-xs text-emerald-700 font-medium border-t border-[#464b71]/10 pt-2">Daya: {pole.solarPowered ? "Panel Surya + Baterai" : "Jaringan Listrik PLN"}</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Maximize2 size={14} className="text-[#118ab2]" /> Fleksibilitas Ruang Jalan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Manajemen Dinamis Tepi Jalan (Curbside Allocation)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Alokasi ruang tepi jalan fleksibel: tempat bongkar muat komersial pagi, parklet kuliner sore, dan titik jemput ride-hailing malam.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CURBSIDE_ZONES.map((z) => (
          <div key={z.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#464b71]">{z.street}</span>
              <span className="rounded-full bg-[#118ab2]/10 text-[#118ab2] px-3 py-0.5 text-xs font-bold">{z.activeMode}</span>
            </div>
            <div className="flex justify-between text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Activity size={14} className="text-[#118ab2]" /> Crowd Dynamics Simulation
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Simulator Dinamika Arus Pejalan Kaki
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Model AI simulasi mikroskopis aliran pejalan kaki, mitigasi penyempitan di tangga stasiun, dan kecepatan langkah aman.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PEDESTRIAN_FLOW_MODELS.map((m) => (
          <div key={m.nodeId} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <h3 className="font-black text-sm text-[#464b71]">{m.nodeId}</h3>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Kapasitas Aliran:</span>
              <span className="font-bold text-[#118ab2]">{m.pedestriansPerMinute} orang/menit</span>
            </div>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Kecepatan Langkah:</span>
              <span>{m.flowVelocityMps} m/detik</span>
            </div>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">Rating Kepadatan: <span className="text-amber-700 font-bold">{m.socialDensityRating}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 50. Open Basemaps View
export function OpenBasemapsView() { return <GlobalDataCenter basemapOnly />; }
