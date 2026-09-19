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
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
          <ShieldAlert size={14} className="text-rose-600" /> Kesiapsiagaan Bencana Perkotaan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Rute Evakuasi Bencana & Titik Kumpul Darurat
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Jalur tercepat menuju shelter tahan gempa, dataran tinggi bebas tsunami/banjir, dan pos logistik medis darurat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {EVACUATION_HUBS.map((h) => (
          <div key={h.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{h.shelterName}</h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">{h.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <div>Kapasitas: <p className="text-base font-black text-[#118ab2]">{h.capacityPersons.toLocaleString()} Orang</p></div>
              <div>Jarak dari Titik Anda: <p className="text-base font-black text-[#464b71]">{h.distanceMeters}m</p></div>
            </div>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">
              Mitigasi Bahaya: <span className="text-amber-700 font-bold">{h.hazardsCovered.join(", ")}</span>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Anchor size={14} className="text-[#118ab2]" /> Jaringan Rantai Pasok Maritim
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Terminal Logistik Pelabuhan & Hub Multimoda
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Kapasitas throughput kontainer TEU, dwell-time kapal, dan interkoneksi jalur kereta barang menuju dry port industri.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PORT_TERMINALS.map((p) => (
          <div key={p.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <h3 className="font-black text-base text-[#464b71]">{p.portName}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <div>Kapasitas Tahunan: <p className="text-base font-black text-[#118ab2]">{p.teuCapacityAnnual}</p></div>
              <div>Kapal Bersandar: <p className="text-base font-black text-[#464b71]">{p.currentVesselCount} Kapal</p></div>
              <div>Waktu Tunggu Sandar: <p className="text-base font-black text-amber-700">{p.avgBerthWaitHours} Jam</p></div>
              <div>Rel Kargo: <p className="text-base font-black text-emerald-700">{p.railConnectivity ? "Tersedia" : "Tidak"}</p></div>
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
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <Clock size={14} className="text-amber-600" /> Temporal GIS & Morfologi Kota
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Morfologi Sejarah Kota & Citra Satelit Lintas Era
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Perbandingan perkembangan urban sprawl, penambahan jalan tol, dan restorasi pedestrianisasi dari tahun 1970 hingga saat ini.
        </p>
      </header>

      <div className="flex gap-2">
        {HISTORICAL_SLICES.map((s) => (
          <button
            key={s.year}
            type="button"
            onClick={() => setSelectedYear(s.year)}
            className={`rounded-2xl px-5 py-2 text-xs font-bold transition border ${
              selectedYear === s.year
                ? "bg-[#118ab2] text-white border-[#118ab2] shadow-sm"
                : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
            }`}
          >
            Tahun {s.year}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
        <div className="flex justify-between items-center border-b border-[#464b71]/10 pb-3">
          <h3 className="font-black text-lg text-[#464b71]">Era {current.year}</h3>
          <span className="text-sm font-bold text-[#118ab2]">Luas Bangun: {current.urbanAreaSqKm} km²</span>
        </div>
        <p className="text-sm text-[#464b71] leading-relaxed">{current.keyMilestone}</p>
        <p className="text-xs text-[#66708d]">Estimasi Populasi Urban: {current.populationMillions} Juta Jiwa</p>
      </div>
    </div>
  );
}

// 25. Spatial Demographics View
export function SpatialDemographicsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-white via-[#faf5ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3.5 py-1 text-xs font-bold text-purple-700 border border-purple-500/20">
          <Users size={14} className="text-purple-600" /> Sensus Spasial & Potensi Kawasan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Demografi Spasial & Daya Beli Kawasan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Kepadatan penduduk per kilometer persegi, arus komuter siang hari, dan proporsi usia produktif untuk perencanaan lokasi bisnis.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DEMOGRAPHIC_ZONES.map((z) => (
          <div key={z.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <h3 className="font-black text-base text-[#464b71]">{z.zoneName}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <div>Kepadatan: <p className="text-base font-black text-purple-700">{z.popDensityPerSqKm.toLocaleString()} / km²</p></div>
              <div>Pendapatan Median: <p className="text-base font-black text-emerald-700">${z.medianIncomeAnnualUsd.toLocaleString()}/thn</p></div>
              <div>Komuter Siang: <p className="text-base font-black text-[#464b71]">+{z.daytimeCommuterInflux.toLocaleString()}</p></div>
              <div>Usia Produktif: <p className="text-base font-black text-[#118ab2]">{z.youthPopulationPct}%</p></div>
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
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Trees size={14} className="text-emerald-600" /> Ruang Terbuka Hijau & Biofilia
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Ruang Terbuka Hijau & Indeks Biofilia Kota
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Taman publik dalam jangkauan jalan kaki 300 meter, persentase tutupan kanopi pohon rindang, dan fasilitas rekreasi warga.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {GREEN_SPACES.map((g) => (
          <div key={g.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{g.parkName}</h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-mono font-bold">{g.areaHectares} Ha</span>
            </div>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Skor NDVI: <strong className="text-emerald-700">{g.ndviScore}</strong></span>
              <span>Tutupan Pohon: <strong className="text-emerald-700">{g.treeCanopyCoverPct}%</strong></span>
            </div>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              Fasilitas: <span className="text-[#464b71] font-medium">{g.amenities.join(", ")}</span>
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
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <Landmark size={14} className="text-amber-600" /> Wisata Pusaka & Arsitektur Dunia
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Rute Monumen Budaya & Warisan Sejarah
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Situs cagar budaya terdaftar, gaya arsitektur vernakular, dan panduan kunjungan ramah pejalan kaki.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {HERITAGE_SITES.map((h) => (
          <div key={h.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{h.name}</h3>
              <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-0.5 text-xs font-mono font-bold">{h.yearBuilt}</span>
            </div>
            <p className="text-xs text-[#66708d]">Gaya: <strong className="text-[#118ab2]">{h.architecturalStyle}</strong></p>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">{h.visitorGuidelines}</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Droplet size={14} className="text-[#118ab2]" /> Bebas Botol Plastik Sekali Pakai
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Titik Isi Ulang Air Minum Publik Gratis
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Kran air siap minum higienis berstandar baku mutu kesehatan dunia di sepanjang jalur pedestrian dan stasiun.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {WATER_REFILL_POINTS.map((w) => (
          <div key={w.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <h3 className="font-black text-base text-[#464b71]">{w.location}</h3>
            <p className="text-xs text-[#118ab2] font-mono font-bold">Baku Mutu: {w.waterQualityIndex}</p>
            <div className="flex justify-between items-center text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <span>Botol Plastik Terhemat:</span>
              <span className="text-lg font-black text-emerald-700">{w.bottlesSavedTotal.toLocaleString()} Unit</span>
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
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
          <Sparkles size={14} className="text-rose-600" /> Sanitasi Inklusif & Ramah Keluarga
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Pencari Toilet Difabel & Sanitasi Publik
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Toilet umum dengan pintu lebar ramah kursi roda, tali darurat (emergency pull cord), dan ruang laktasi ibu menyusui.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {ACCESSIBLE_RESTROOMS.map((r) => (
          <div key={r.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{r.location}</h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 font-bold">⭐ {r.cleanlinessScore}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 font-bold">♿ Ramp Kursi Roda</span>
              <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 font-bold">🚨 Tali Tarik Darurat</span>
              <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 font-bold">👶 Meja Popok Bayi</span>
            </div>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">Jam Buka: {r.hours}</p>
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
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
          <Siren size={14} className="text-rose-600" /> Computer-Aided Dispatch (CAD)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Pusat Komando Insiden & Armada Darurat
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Monitoring koordinasi ambulans, pemadam kebakaran, dan rute cepat bebas hambatan menuju lokasi insiden darurat.
        </p>
      </header>

      <div className="space-y-4">
        {INCIDENT_ALERTS.map((alert) => (
          <div key={alert.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-5 shadow-[0_10px_24px_rgba(70,75,113,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-xs font-bold">{alert.incidentType}</span>
              <h3 className="font-black text-sm text-[#464b71]">{alert.location}</h3>
              <p className="text-xs text-[#66708d]">Unit Respon: {alert.respondingUnits.join(", ")}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#66708d]">Estimasi Tiba</span>
              <p className="text-xl font-black text-amber-700">{alert.etaMinutes} Menit</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Cross size={14} className="text-[#118ab2]" /> Fasilitas Medis Akreditasi Global
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Koridor Wisata Medis & Faskes Akreditasi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Rumah sakit berstandar JCI internasional dengan staf penerjemah medis multibahasa dan akses stasiun kereta langsung.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {MEDICAL_FACILITIES.map((f) => (
          <div key={f.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{f.hospitalName}</h3>
              <span className="rounded-full bg-[#118ab2]/10 text-[#118ab2] px-3 py-0.5 text-xs font-bold">{f.accreditation}</span>
            </div>
            <p className="text-xs text-[#66708d]">Spesialisasi: {f.specialties.join(" • ")}</p>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3 flex justify-between">
              <span>Bahasa: {f.multilingualStaff.join(", ")}</span>
              <span className="text-[#118ab2] font-semibold">{f.distanceToTransitKm} km dari MRT</span>
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
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <Shield size={14} className="text-amber-600" /> Restorasi & Ketahanan Bangunan Bersejarah
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Preservasi Fasad Arsitektur Vernakular
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Audit berkala integritas struktur cagar budaya kolonial dan vernakular dari ancaman penurunan tanah dan getaran transportasi.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {HERITAGE_BUILDINGS.map((b) => (
          <div key={b.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{b.buildingName}</h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">{b.preservationStatus}</span>
            </div>
            <p className="text-xs text-amber-800 font-semibold">{b.constructionEra}</p>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">{b.architecturalStyle}</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Globe size={14} className="text-[#118ab2]" /> Bantuan Konsuler & Jalur Diplomatik
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Navigasi Kedutaan & Layanan Konsuler Internasional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Panduan lokasi kedutaan besar negara-negara sahabat, hotline bantuan darurat warga negara asing, dan jadwal layanan visa.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {DIPLOMATIC_MISSIONS.map((m) => (
          <div key={m.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{m.countryRepresented}</h3>
              <span className="rounded-full bg-[#118ab2]/10 text-[#118ab2] px-3 py-0.5 text-xs font-bold">{m.missionType}</span>
            </div>
            <p className="text-xs text-[#66708d]">{m.address}</p>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3 space-y-1">
              <p>Hotline Darurat: <strong className="text-rose-600">{m.emergencyHotline}</strong></p>
              <p>Jam Konsuler: {m.consularHours}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
