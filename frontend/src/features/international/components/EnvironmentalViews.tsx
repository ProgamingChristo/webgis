"use client";

import { useState } from "react";
import {
  Wind,
  Sun,
  TrendingUp,
  Volume2,
  Waves,
  SunDim,
  CloudRain,
  Recycle,
  Satellite,
  Feather,
  AlertTriangle,
} from "lucide-react";
import {
  AQI_STATIONS,
  HEAT_ISLAND_ZONES,
  ELEVATION_PROFILE,
  NOISE_STATIONS,
  FLOOD_STATIONS,
  SOLAR_SHADOW_ZONES,
  DOPPLER_FRAMES,
  SMART_WASTE_BINS,
  SATELLITE_NDVI_ZONES,
  WILDLIFE_CORRIDORS,
  SEA_LEVEL_SIMS,
} from "../data";

// 4. AQI Microclimate View
export function AqiView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Wind size={14} className="text-[#118ab2]" /> Jaringan Sensor Udara & Mikroklimat
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Kualitas Udara & Rute Rendah Emisi Global
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Pemantauan real-time PM2.5, PM10, suhu permukaan dan identifikasi koridor pejalan kaki berudara paling bersih di kota-kota besar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {AQI_STATIONS.map((s) => (
          <div key={s.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#464b71]">{s.name}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#66708d] uppercase">{s.city}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-[#118ab2]">{s.aqi}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  s.status === "GOOD"
                    ? "bg-emerald-100 text-emerald-800"
                    : s.status === "MODERATE"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {s.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <div>PM2.5: <span className="text-[#464b71] font-bold">{s.pm25} µg/m³</span></div>
              <div>PM10: <span className="text-[#464b71] font-bold">{s.pm10} µg/m³</span></div>
              <div>Suhu: <span className="text-[#464b71] font-bold">{s.tempCelsius}°C</span></div>
              <div>Kelembaban: <span className="text-[#464b71] font-bold">{s.humidityPct}%</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Urban Heat Island View
export function UrbanHeatView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <Sun size={14} className="text-amber-600" /> Analisis Satelit Termal Perkotaan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Pulau Panas Perkotaan (Urban Heat Island)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Deteksi zona kanopi aspal bersuhu tinggi, ketersediaan misting station pejalan kaki, dan rute teduh untuk mencegah sengatan panas (heatstroke).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {HEAT_ISLAND_ZONES.map((z) => (
          <div key={z.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[#464b71]">{z.name}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#66708d] uppercase">{z.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-[#66708d]">Suhu Permukaan:</div>
              <div className="text-2xl font-black text-amber-600">{z.surfaceTempC}°C</div>
            </div>
            <div className="space-y-1.5 text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <div className="flex justify-between">
                <span>Tutupan Pohon:</span>
                <span className="font-bold text-emerald-700">{z.treeCanopyPct}%</span>
              </div>
              <div className="flex justify-between">
                <span>Fasilitas Peneduh:</span>
                <span className="text-[#464b71] font-medium">{z.coolingAmenity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. Elevation Profile View
export function ElevationProfileView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <TrendingUp size={14} className="text-[#118ab2]" /> Digital Elevation Model (DEM)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Profil Elevasi & Kemiringan Tanjakan Trotoar
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Analisis topografi rute pejalan kaki, tanjakan curam, dan evaluasi aksesibilitas kursi roda sesuai standar kemiringan internasional (&lt; 8%).
        </p>
      </header>

      <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-6">
        <h3 className="text-sm font-black text-[#464b71]">Grafik Elevasi Koridor Uji (0 - 1.000 Meter)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ELEVATION_PROFILE.map((p, idx) => (
            <div key={idx} className="rounded-2xl border border-[#464b71]/10 bg-[#f8fafc] p-3.5 text-center space-y-2">
              <div className="text-[11px] text-[#66708d] font-mono">{p.distanceMeters}m</div>
              <div className="text-lg font-black text-[#118ab2]">{p.elevationMeters}m dpl</div>
              <div className="text-[11px] text-[#464b71] font-bold">Gradien: {p.gradientPct}%</div>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.accessibilityRating === "EXCELLENT" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {p.accessibilityRating}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 9. Noise Pollution View
export function NoisePollutionView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
          <Volume2 size={14} className="text-rose-600" /> Sensor Akustik & Desibel Kota
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Peta Kebisingan Akustik & Koridor Tenang
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Tingkat polusi suara di sekitar arteri jalan raya vs koridor permukiman dan taman publik untuk kenyamanan akustik warga.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {NOISE_STATIONS.map((n) => (
          <div key={n.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-[#464b71]">{n.zone}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#66708d] uppercase">{n.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#66708d]">Intensitas:</span>
              <span className="text-3xl font-black text-rose-600">{n.currentDb} dB</span>
            </div>
            <p className="text-[11px] text-[#66708d]">Batas Wajar: {n.limitDb} dB</p>
            <p className="text-[11px] text-[#464b71] border-t border-[#464b71]/10 pt-2 font-medium">Sumber: {n.primaryNoiseSource}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 10. Flood Monitoring View
export function FloodMonitoringView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Waves size={14} className="text-[#118ab2]" /> Sistem Telemetri Hidrologi Terpadu
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Pemantauan Banjir & Elevasi Muka Air Realtime
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Peringatan dini tinggi muka air pintu air sungai, pasang surut pesisir, dan status kesiapsiagaan pompa polder banjir kota.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {FLOOD_STATIONS.map((f) => (
          <div key={f.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[#464b71]">{f.stationName}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#66708d] uppercase">{f.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#66708d]">Tinggi Air:</span>
              <span className="text-2xl font-black text-[#118ab2]">{f.waterLevelMeters} cm/m</span>
            </div>
            <div className="flex justify-between text-xs text-[#464b71] border-t border-[#464b71]/10 pt-3">
              <span>Status: <strong className="text-emerald-700">{f.status}</strong></span>
              <span>Tren: <strong className="text-[#118ab2]">{f.trend}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 11. Solar Radiation View
export function SolarRadiationView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <SunDim size={14} className="text-amber-600" /> Simulasi Bayangan Arsitektur 3D
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Radiasi Matahari & Jalur Terlindung Bayangan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Perhitungan bayangan gedung bertingkat pada sudut matahari berbeda untuk navigasi pejalan kaki yang sejuk dan terlindung sinar UV.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SOLAR_SHADOW_ZONES.map((s) => (
          <div key={s.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <h3 className="font-black text-sm text-[#464b71]">{s.streetName}</h3>
            <div className="flex justify-between text-xs text-[#464b71]">
              <span>Indeks UV: <strong className="text-amber-700">{s.uvIndex}</strong></span>
              <span>Keteduhan Gedung: <strong className="text-emerald-700">{s.shadowCoveragePct}%</strong></span>
            </div>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">Waktu Jalan Kaki Paling Nyaman: {s.recommendedTime}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 34. Weather Radar View
export function WeatherRadarView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <CloudRain size={14} className="text-[#118ab2]" /> Doppler Precipitation Nowcasting
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Radar Doppler Presipitasi & Angin Terowongan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Prediksi hujan lebat dan hembusan angin kencang dalam resolusi waktu 10 menit untuk perlindungan pejalan kaki di luar ruangan.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {DOPPLER_FRAMES.map((f, idx) => (
          <div key={idx} className="rounded-3xl border border-[#464b71]/15 bg-white p-5 text-center space-y-2 shadow-[0_4px_12px_rgba(70,75,113,0.04)]">
            <span className="text-[11px] text-[#66708d] font-mono">{f.timestamp}</span>
            <div className="text-xl font-black text-[#118ab2]">{f.precipitationMmPerHour} mm/h</div>
            <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-[#118ab2]/10 text-[#118ab2]">
              {f.stormCellIntensity}
            </span>
            <p className="text-[10px] text-[#66708d]">Angin: {f.windGustKmh} km/h</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 36. Waste Recycling View
export function WasteRecyclingView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Recycle size={14} className="text-emerald-600" /> Sensor Pengelolaan Sampah Cerdas
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Sensor Tempat Sampah Pintar & Bank Sampah Sirkular
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Telemetri level kepenuhan tempat sampah umum IoT dan rute optimal armada kebersihan tanpa mengganggu pejalan kaki.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SMART_WASTE_BINS.map((b) => (
          <div key={b.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#464b71]">{b.location}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#66708d] uppercase">{b.binType}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-[#66708d]">
              <span>Tingkat Kepenuhan:</span>
              <span className="text-lg font-black text-amber-600">{b.fillLevelPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${b.fillLevelPct}%` }} />
            </div>
            <p className="text-[11px] text-[#66708d] border-t border-[#464b71]/10 pt-2">Dikosongkan: {b.lastEmptiedHoursAgo} jam lalu</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 45. Satellite NDVI View
export function SatelliteNdviView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Satellite size={14} className="text-emerald-600" /> Spektrum Citra Sentinel-2 / Landsat
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Monitoring Kekeringan Vegetasi NDVI Satelit
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Analisis spektral Normalized Difference Vegetation Index (NDVI) untuk memantau kesehatan kanopi pohon pelindung trotoar kota.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SATELLITE_NDVI_ZONES.map((z) => (
          <div key={z.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <h3 className="font-black text-sm text-[#464b71]">{z.zone}</h3>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Skor Rata-rata NDVI:</span>
              <span className="text-base font-black text-emerald-700">{z.meanNdvi}</span>
            </div>
            <div className="flex justify-between text-xs text-[#66708d]">
              <span>Status Stress Tanaman:</span>
              <span className="font-bold text-amber-700">{z.droughtStressLevel}</span>
            </div>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">Defisit Pendinginan: +{z.coolingDeficitCelsius}°C</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 46. Wildlife Corridors View
export function WildlifeCorridorsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Feather size={14} className="text-emerald-600" /> Ekologi Perkotaan & Koridor Hayati
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Koridor Lintasan Satwa Liar Urban
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Jalur kanopi hijau yang menghubungkan taman-taman kota untuk lintasan burung, kupu-kupu, dan fauna endemik secara berdampingan dengan warga.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {WILDLIFE_CORRIDORS.map((c) => (
          <div key={c.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <h3 className="font-black text-sm text-[#464b71]">{c.corridorName}</h3>
            <p className="text-xs text-[#66708d]">Jembatan Penyeberangan: {c.crossingStructures}</p>
            <div className="text-xs text-[#66708d]">
              <span>Spesies Prioritas: </span>
              <span className="text-emerald-700 font-bold">{c.targetSpecies.join(", ")}</span>
            </div>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">Kontinuitas Kanopi: {c.canopyContinuityPct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 47. Sea Level Rise View
export function SeaLevelRiseView() {
  const [selectedRise, setSelectedRise] = useState<number>(1.0);
  const activeSim = SEA_LEVEL_SIMS.find((s) => s.riseMeters === selectedRise) || SEA_LEVEL_SIMS[1];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
          <AlertTriangle size={14} className="text-rose-600" /> Simulasi Resiko Iklim IPCC
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Simulator Kenaikan Muka Air Laut & Rob Pesisir
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Proyeksi genangan banjir rob di kawasan pesisir kota pada skenario kenaikan 0.5m hingga 2.0m untuk ketahanan infrastruktur jangka panjang.
        </p>
      </header>

      {/* Selector */}
      <div className="flex gap-3">
        {[0.5, 1.0, 2.0].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSelectedRise(m)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition border ${
              selectedRise === m
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
            }`}
          >
            Kenaikan +{m} Meter
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
        <h3 className="font-black text-base text-[#464b71]">Skenario Kenaikan +{activeSim.riseMeters}m</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#66708d]">
          <div>Area Tergenang: <strong className="text-rose-600 text-sm font-black">{activeSim.inundatedAreaSqKm} km²</strong></div>
          <div>Populasi Terdampak: <strong className="text-rose-600 text-sm font-black">{activeSim.affectedPopulation.toLocaleString("id-ID")} Jiwa</strong></div>
        </div>
        <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
          Aset Kritis Beresiko: <span className="text-[#464b71] font-bold">{activeSim.criticalAssetsAtRisk.join(", ")}</span>
        </div>
        <div className="rounded-2xl border border-[#118ab2]/20 bg-[#f0f9ff] p-3.5 text-xs text-[#118ab2] font-semibold">
          Status Tanggul: {activeSim.defenseWallStatus}
        </div>
      </div>
    </div>
  );
}
