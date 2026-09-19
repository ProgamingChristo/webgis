"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Anchor,
  Clock,
  Users,
  Trees,
  Landmark,
  Droplet,
  Sparkles,
  Siren,
  Cross,
  Shield,
  Globe,
} from "lucide-react";
import {
  EVACUATION_HUBS,
  PORT_TERMINALS,
  HISTORICAL_SLICES,
  DEMOGRAPHIC_ZONES,
  GREEN_SPACES,
  HERITAGE_SITES,
  WATER_REFILL_POINTS,
  ACCESSIBLE_RESTROOMS,
  INCIDENT_ALERTS,
  MEDICAL_FACILITIES,
  HERITAGE_BUILDINGS,
  DIPLOMATIC_MISSIONS,
} from "../data";

// 12. Emergency Evacuation View
export function EmergencyEvacuationView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-slate-950 via-red-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
          <ShieldAlert size={14} className="text-red-400" /> Kesiapsiagaan Bencana Perkotaan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Rute Evakuasi Bencana & Titik Kumpul Darurat
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Jalur tercepat menuju shelter tahan gempa, dataran tinggi bebas tsunami/banjir, dan pos logistik medis darurat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {EVACUATION_HUBS.map((h) => (
          <div key={h.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{h.shelterName}</h3>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-bold">{h.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div>Kapasitas: <p className="text-base font-bold text-cyan-400">{h.capacityPersons.toLocaleString()} Orang</p></div>
              <div>Jarak dari Titik Anda: <p className="text-base font-bold text-white">{h.distanceMeters}m</p></div>
            </div>
            <div className="text-xs text-slate-400">
              Mitigasi Bahaya: <span className="text-amber-300 font-medium">{h.hazardsCovered.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 23. Port Logistics View
export function PortLogisticsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
          <Anchor size={14} className="text-blue-400" /> Jaringan Rantai Pasok Maritim
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Terminal Logistik Pelabuhan & Hub Multimoda
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Kapasitas throughput kontainer TEU, dwell-time kapal, dan interkoneksi jalur kereta barang menuju dry port industri.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PORT_TERMINALS.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white">{p.portName}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div>Kapasitas Tahunan: <p className="text-base font-bold text-cyan-400">{p.teuCapacityAnnual}</p></div>
              <div>Kapal Bersandar: <p className="text-base font-bold text-white">{p.currentVesselCount} Kapal</p></div>
              <div>Waktu Tunggu Sandar: <p className="text-base font-bold text-amber-400">{p.avgBerthWaitHours} Jam</p></div>
              <div>Rel Kargo: <p className="text-base font-bold text-emerald-400">{p.railConnectivity ? "Tersedia" : "Tidak"}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 24. Historical Map View
export function HistoricalMapView() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const current = HISTORICAL_SLICES.find((s) => s.year === selectedYear) || HISTORICAL_SLICES[2];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
          <Clock size={14} className="text-amber-400" /> Temporal GIS & Morfologi Kota
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Morfologi Sejarah Kota & Citra Satelit Lintas Era
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Perbandingan perkembangan urban sprawl, penambahan jalan tol, dan restorasi pedestrianisasi dari tahun 1970 hingga saat ini.
        </p>
      </header>

      <div className="flex gap-2">
        {HISTORICAL_SLICES.map((s) => (
          <button
            key={s.year}
            type="button"
            onClick={() => setSelectedYear(s.year)}
            className={`rounded-xl px-5 py-2 text-xs font-bold transition border ${
              selectedYear === s.year
                ? "bg-amber-500 text-slate-950 border-amber-500"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            Tahun {s.year}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-lg text-white">Era {current.year}</h3>
          <span className="text-sm font-bold text-amber-400">Luas Bangun: {current.urbanAreaSqKm} km²</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{current.keyMilestone}</p>
        <p className="text-xs text-slate-400">Estimasi Populasi Urban: {current.populationMillions} Juta Jiwa</p>
      </div>
    </div>
  );
}

// 25. Spatial Demographics View
export function SpatialDemographicsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">
          <Users size={14} className="text-purple-400" /> Sensus Spasial & Potensi Kawasan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Demografi Spasial & Daya Beli Kawasan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Kepadatan penduduk per kilometer persegi, arus komuter siang hari, dan proporsi usia produktif untuk perencanaan lokasi bisnis.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DEMOGRAPHIC_ZONES.map((z) => (
          <div key={z.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white">{z.zoneName}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div>Kepadatan: <p className="text-base font-bold text-purple-400">{z.popDensityPerSqKm.toLocaleString()} / km²</p></div>
              <div>Pendapatan Median: <p className="text-base font-bold text-emerald-400">${z.medianIncomeAnnualUsd.toLocaleString()}/thn</p></div>
              <div>Komuter Siang: <p className="text-base font-bold text-white">+{z.daytimeCommuterInflux.toLocaleString()}</p></div>
              <div>Usia Produktif: <p className="text-base font-bold text-cyan-400">{z.youthPopulationPct}%</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 27. Green Spaces View
export function GreenSpacesView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Trees size={14} className="text-emerald-400" /> Ruang Terbuka Hijau & Biofilia
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Ruang Terbuka Hijau & Indeks Biofilia Kota
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Taman publik dalam jangkauan jalan kaki 300 meter, persentase tutupan kanopi pohon rindang, dan fasilitas rekreasi warga.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {GREEN_SPACES.map((g) => (
          <div key={g.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{g.parkName}</h3>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-mono">{g.areaHectares} Ha</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Skor NDVI: <strong className="text-emerald-400">{g.ndviScore}</strong></span>
              <span>Tutupan Pohon: <strong className="text-emerald-400">{g.treeCanopyCoverPct}%</strong></span>
            </div>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-3">
              Fasilitas: <span className="text-slate-200">{g.amenities.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 28. Cultural Heritage View
export function CulturalHeritageView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
          <Landmark size={14} className="text-amber-400" /> Wisata Pusaka & Arsitektur Dunia
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Rute Monumen Budaya & Warisan Sejarah
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Situs cagar budaya terdaftar, gaya arsitektur vernakular, dan panduan kunjungan ramah pejalan kaki.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {HERITAGE_SITES.map((h) => (
          <div key={h.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{h.name}</h3>
              <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-xs font-mono">{h.yearBuilt}</span>
            </div>
            <p className="text-xs text-slate-300">Gaya: <strong className="text-cyan-300">{h.architecturalStyle}</strong></p>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">{h.visitorGuidelines}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 29. Water Refill View
export function WaterRefillView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
          <Droplet size={14} className="text-cyan-400" /> Bebas Botol Plastik Sekali Pakai
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Titik Isi Ulang Air Minum Publik Gratis
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Kran air siap minum higienis berstandar baku mutu kesehatan dunia di sepanjang jalur pedestrian dan stasiun.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {WATER_REFILL_POINTS.map((w) => (
          <div key={w.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white">{w.location}</h3>
            <p className="text-xs text-cyan-300 font-mono">Baku Mutu: {w.waterQualityIndex}</p>
            <div className="flex justify-between items-center text-xs text-slate-300 border-t border-slate-800 pt-3">
              <span>Botol Plastik Terhemat:</span>
              <span className="text-lg font-black text-emerald-400">{w.bottlesSavedTotal.toLocaleString()} Unit</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 30. Accessible Restroom View
export function AccessibleRestroomsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-slate-950 via-pink-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-300 border border-pink-500/30">
          <Sparkles size={14} className="text-pink-400" /> Sanitasi Inklusif & Ramah Keluarga
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Pencari Toilet Difabel & Sanitasi Publik
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Toilet umum dengan pintu lebar ramah kursi roda, tali darurat darurat (emergency pull cord), dan ruang laktasi ibu menyusui.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {ACCESSIBLE_RESTROOMS.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{r.location}</h3>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-yellow-400">⭐ {r.cleanlinessScore}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5">♿ Ramp Kursi Roda</span>
              <span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5">🚨 Tali Tarik Darurat</span>
              <span className="rounded bg-pink-500/20 text-pink-300 px-2 py-0.5">👶 Meja Popok Bayi</span>
            </div>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">Jam Buka: {r.hours}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 32. Incident Dispatch View
export function IncidentDispatchView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-slate-950 via-red-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
          <Siren size={14} className="text-red-400" /> Computer-Aided Dispatch (CAD)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Pusat Komando Insiden & Armada Darurat
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Monitoring koordinasi ambulans, pemadam kebakaran, dan rute cepat bebas hambatan menuju lokasi insiden darurat.
        </p>
      </header>

      <div className="space-y-4">
        {INCIDENT_ALERTS.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded bg-red-500/20 text-red-300 px-2 py-0.5 text-xs font-bold">{alert.incidentType}</span>
              <h3 className="font-bold text-sm text-white">{alert.location}</h3>
              <p className="text-xs text-slate-400">Unit Respon: {alert.respondingUnits.join(", ")}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Estimasi Tiba</span>
              <p className="text-xl font-black text-amber-400">{alert.etaMinutes} Menit</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 44. Medical Tourism View
export function MedicalTourismView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-slate-950 via-teal-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300 border border-teal-500/30">
          <Cross size={14} className="text-teal-400" /> Fasilitas Medis Akreditasi Global
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Koridor Wisata Medis & Faskes Akreditasi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Rumah sakit berstandar JCI internasional dengan staf penerjemah medis multibahasa dan akses stasiun kereta langsung.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {MEDICAL_FACILITIES.map((f) => (
          <div key={f.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{f.hospitalName}</h3>
              <span className="rounded bg-teal-500/20 text-teal-300 px-2 py-0.5 text-xs font-bold">{f.accreditation}</span>
            </div>
            <p className="text-xs text-slate-300">Spesialisasi: {f.specialties.join(" • ")}</p>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 flex justify-between">
              <span>Bahasa: {f.multilingualStaff.join(", ")}</span>
              <span className="text-cyan-400">{f.distanceToTransitKm} km dari MRT</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 48. Heritage Preservation View
export function HeritagePreservationView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
          <Shield size={14} className="text-amber-400" /> Restorasi & Ketahanan Bangunan Bersejarah
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Preservasi Fasad Arsitektur Vernakular
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Audit berkala integritas struktur cagar budaya kolonial dan vernakular dari ancaman penurunan tanah dan getaran transportasi.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {HERITAGE_BUILDINGS.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{b.buildingName}</h3>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs">{b.preservationStatus}</span>
            </div>
            <p className="text-xs text-amber-300">{b.constructionEra}</p>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">{b.architecturalStyle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 49. Global Embassy View
export function GlobalEmbassyView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
          <Globe size={14} className="text-indigo-400" /> Bantuan Konsuler & Jalur Diplomatik
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Navigasi Kedutaan & Layanan Konsuler Internasional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Panduan lokasi kedutaan besar negara-negara sahabat, hotline bantuan darurat warga negara asing, dan jadwal layanan visa.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DIPLOMATIC_MISSIONS.map((m) => (
          <div key={m.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{m.countryRepresented}</h3>
              <span className="rounded bg-indigo-500/20 text-indigo-300 px-2 py-0.5 text-xs font-bold">{m.missionType}</span>
            </div>
            <p className="text-xs text-slate-300">{m.address}</p>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 space-y-1">
              <p>Hotline Darurat: <strong className="text-cyan-400">{m.emergencyHotline}</strong></p>
              <p>Jam Konsuler: {m.consularHours}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
