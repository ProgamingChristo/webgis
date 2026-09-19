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
      <header className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-slate-950 via-sky-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-500/30">
          <Wind size={14} className="text-sky-400" /> Jaringan Sensor Udara & Mikroklimat
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Kualitas Udara & Rute Rendah Emisi Global
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Pemantauan real-time PM2.5, PM10, suhu permukaan dan identifikasi koridor pejalan kaki berudara paling bersih di kota-kota besar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {AQI_STATIONS.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">{s.name}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 uppercase">{s.city}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-cyan-400">{s.aqi}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  s.status === "GOOD"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : s.status === "MODERATE"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {s.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800 pt-3">
              <div>PM2.5: <span className="text-white font-bold">{s.pm25} µg/m³</span></div>
              <div>PM10: <span className="text-white font-bold">{s.pm10} µg/m³</span></div>
              <div>Suhu: <span className="text-white font-bold">{s.tempCelsius}°C</span></div>
              <div>Kelembaban: <span className="text-white font-bold">{s.humidityPct}%</span></div>
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
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
          <Sun size={14} className="text-amber-400" /> Analisis Satelit Termal Perkotaan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Pulau Panas Perkotaan (Urban Heat Island)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Deteksi zona kanopi aspal bersuhu tinggi, ketersediaan misting station pejalan kaki, dan rute teduh untuk mencegah sengatan panas (heatstroke).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {HEAT_ISLAND_ZONES.map((z) => (
          <div key={z.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{z.name}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase">{z.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-slate-400">Suhu Permukaan:</div>
              <div className="text-2xl font-black text-amber-400">{z.surfaceTempC}°C</div>
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Tutupan Pohon:</span>
                <span className="font-bold text-emerald-400">{z.treeCanopyPct}%</span>
              </div>
              <div className="flex justify-between">
                <span>Fasilitas Peneduh:</span>
                <span className="text-slate-300">{z.coolingAmenity}</span>
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
      <header className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
          <TrendingUp size={14} className="text-cyan-400" /> Digital Elevation Model (DEM)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Profil Elevasi & Kemiringan Tanjakan Trotoar
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Analisis topografi rute pejalan kaki, tanjakan curam, dan evaluasi aksesibilitas kursi roda sesuai standar kemiringan internasional (&lt; 8%).
        </p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        <h3 className="text-sm font-bold text-white">Grafik Elevasi Koridor Uji (0 - 1.000 Meter)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ELEVATION_PROFILE.map((p, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-center space-y-2">
              <div className="text-[11px] text-slate-400 font-mono">{p.distanceMeters}m</div>
              <div className="text-lg font-black text-cyan-400">{p.elevationMeters}m dpl</div>
              <div className="text-[11px] text-slate-300 font-bold">Gradien: {p.gradientPct}%</div>
              <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold ${p.accessibilityRating === "EXCELLENT" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
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
      <header className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-slate-950 via-pink-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-300 border border-pink-500/30">
          <Volume2 size={14} className="text-pink-400" /> Sensor Akustik & Desibel Kota
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Peta Kebisingan Akustik & Koridor Tenang
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Tingkat polusi suara di sekitar arteri jalan raya vs koridor permukiman dan taman publik untuk kenyamanan akustik warga.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {NOISE_STATIONS.map((n) => (
          <div key={n.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">{n.zone}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase">{n.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Intensitas:</span>
              <span className="text-3xl font-black text-pink-400">{n.currentDb} dB</span>
            </div>
            <p className="text-[11px] text-slate-400">Batas Wajar: {n.limitDb} dB</p>
            <p className="text-[11px] text-slate-300 border-t border-slate-800 pt-2">Sumber: {n.primaryNoiseSource}</p>
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
      <header className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
          <Waves size={14} className="text-blue-400" /> Sistem Telemetri Hidrologi Terpadu
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Pemantauan Banjir & Elevasi Muka Air Realtime
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Peringatan dini tinggi muka air pintu air sungai, pasang surut pesisir, dan status kesiapsiagaan pompa polder banjir kota.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {FLOOD_STATIONS.map((f) => (
          <div key={f.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{f.stationName}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase">{f.city}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Tinggi Air:</span>
              <span className="text-2xl font-black text-cyan-400">{f.waterLevelMeters} cm/m</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Status: <strong className="text-emerald-400">{f.status}</strong></span>
              <span>Tren: {f.trend}</span>
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
      <header className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-slate-950 via-yellow-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300 border border-yellow-500/30">
          <SunDim size={14} className="text-yellow-400" /> Simulasi Bayangan Arsitektur 3D
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Radiasi Matahari & Jalur Terlindung Bayangan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Perhitungan bayangan gedung bertingkat pada sudut matahari berbeda untuk navigasi pejalan kaki yang sejuk dan terlindung sinar UV.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SOLAR_SHADOW_ZONES.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white">{s.streetName}</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Indeks UV: <strong className="text-amber-400">{s.uvIndex}</strong></span>
              <span>Keteduhan Gedung: <strong className="text-emerald-400">{s.shadowCoveragePct}%</strong></span>
            </div>
            <p className="text-xs text-slate-400">Waktu Jalan Kaki Paling Nyaman: {s.recommendedTime}</p>
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
      <header className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
          <CloudRain size={14} className="text-blue-400" /> Doppler Precipitation Nowcasting
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Radar Doppler Presipitasi & Angin Terowongan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Prediksi hujan lebat dan hembusan angin kencang dalam resolusi waktu 10 menit untuk perlindungan pejalan kaki di luar ruangan.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {DOPPLER_FRAMES.map((f, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center space-y-2">
            <span className="text-[11px] text-slate-400 font-mono">{f.timestamp}</span>
            <div className="text-xl font-black text-cyan-400">{f.precipitationMmPerHour} mm/h</div>
            <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300">
              {f.stormCellIntensity}
            </span>
            <p className="text-[10px] text-slate-400">Angin: {f.windGustKmh} km/h</p>
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
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Recycle size={14} className="text-emerald-400" /> Sensor Pengelolaan Sampah Cerdas
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Sensor Tempat Sampah Pintar & Bank Sampah Sirkular
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Telemetri level kepenuhan tempat sampah umum IoT dan rute optimal armada kebersihan tanpa mengganggu pejalan kaki.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SMART_WASTE_BINS.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white">{b.location}</span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 uppercase">{b.binType}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>Tingkat Kepenuhan:</span>
              <span className="text-lg font-black text-amber-400">{b.fillLevelPct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${b.fillLevelPct}%` }} />
            </div>
            <p className="text-[11px] text-slate-400">Dikosongkan: {b.lastEmptiedHoursAgo} jam lalu</p>
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
      <header className="rounded-2xl border border-green-500/30 bg-gradient-to-r from-slate-950 via-green-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300 border border-green-500/30">
          <Satellite size={14} className="text-green-400" /> Spektrum Citra Sentinel-2 / Landsat
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Monitoring Kekeringan Vegetasi NDVI Satelit
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Analisis spektral Normalized Difference Vegetation Index (NDVI) untuk memantau kesehatan kanopi pohon pelindung trotoar kota.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SATELLITE_NDVI_ZONES.map((z) => (
          <div key={z.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white">{z.zone}</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Skor Rata-rata NDVI:</span>
              <span className="text-base font-black text-emerald-400">{z.meanNdvi}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Status Stress Tanaman:</span>
              <span className="font-bold text-amber-400">{z.droughtStressLevel}</span>
            </div>
            <p className="text-xs text-slate-400">Defisit Pendinginan: +{z.coolingDeficitCelsius}°C</p>
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
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Feather size={14} className="text-emerald-400" /> Ekologi Perkotaan & Koridor Hayati
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Koridor Lintasan Satwa Liar Urban
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Jalur kanopi hijau yang menghubungkan taman-taman kota untuk lintasan burung, kupu-kupu, dan fauna endemik secara berdampingan dengan warga.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {WILDLIFE_CORRIDORS.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white">{c.corridorName}</h3>
            <p className="text-xs text-slate-400">Jembatan Penyeberangan: {c.crossingStructures}</p>
            <div className="text-xs text-slate-300">
              <span>Spesies Prioritas: </span>
              <span className="text-emerald-400 font-bold">{c.targetSpecies.join(", ")}</span>
            </div>
            <p className="text-xs text-slate-400">Kontinuitas Kanopi: {c.canopyContinuityPct}%</p>
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
      <header className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-slate-950 via-red-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 border border-red-500/30">
          <AlertTriangle size={14} className="text-red-400" /> Simulasi Resiko Iklim IPCC
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Simulator Kenaikan Muka Air Laut & Rob Pesisir
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
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
            className={`rounded-xl px-4 py-2 text-xs font-bold transition border ${
              selectedRise === m
                ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Kenaikan +{m} Meter
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-base text-white">Skenario Kenaikan +{activeSim.riseMeters}m</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div>Area Tergenang: <strong className="text-red-400 text-sm">{activeSim.inundatedAreaSqKm} km²</strong></div>
          <div>Populasi Terdampak: <strong className="text-red-400 text-sm">{activeSim.affectedPopulation.toLocaleString("id-ID")} Jiwa</strong></div>
        </div>
        <div className="text-xs text-slate-400">
          Aset Kritis Beresiko: <span className="text-white font-medium">{activeSim.criticalAssetsAtRisk.join(", ")}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-cyan-300">
          Status Tanggul: {activeSim.defenseWallStatus}
        </div>
      </div>
    </div>
  );
}
