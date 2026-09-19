"use client";

import { useState } from "react";
import Link from "next/link";
import { Footprints, Leaf, HeartPulse, TreePine, ArrowRight, RotateCcw } from "lucide-react";
import { calculateEcoSavings, SAMPLE_ECO_TRIPS } from "../data";

export function EcoWalkView() {
  const [customDistanceMeters, setCustomDistanceMeters] = useState<number>(1200);

  const ecoResult = calculateEcoSavings(customDistanceMeters);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-900 to-teal-950 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Leaf size={14} /> Mobilitas Berkelanjutan & Nol Emisi
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Kalkulator Langkah Hijau & Jejak Karbon Pejalan Kaki
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-emerald-100">
              Ketahui kontribusi nyata setiap langkah kaki Anda di Jakarta terhadap penurunan emisi gas rumah kaca, penghematan bahan bakar, dan kesehatan kardiovaskular.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-400 transition"
            >
              <Footprints size={16} /> Mulai Rute Berjalan Kaki
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Calculator Box */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Input Jarak Perjalanan
            </span>
            <h2 className="text-lg font-black text-slate-900">Simulasikan Jarak Jalan Kaki Anda</h2>
            <p className="mt-1 text-xs text-slate-500">
              Geser slider atau masukkan jarak berjalan kaki harian Anda untuk melihat dampaknya.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Jarak Jalan Kaki:</span>
              <span className="text-xl font-black text-emerald-700">
                {customDistanceMeters} meter ({(customDistanceMeters / 1000).toFixed(2)} km)
              </span>
            </div>

            <input
              type="range"
              min="200"
              max="5000"
              step="50"
              value={customDistanceMeters}
              onChange={(e) => setCustomDistanceMeters(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-emerald-100 accent-emerald-600"
            />

            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>200m (Santai)</span>
              <span>1.5km (Komuter)</span>
              <span>5.0km (Aktif)</span>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[500, 1000, 1800, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomDistanceMeters(preset)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    customDistanceMeters === preset
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {preset}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomDistanceMeters(1200)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Calculated Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {/* Card 1: CO2 vs Car */}
          <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Emisi Terhindar vs Mobil
              </span>
              <Leaf size={18} className="text-emerald-600" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-slate-900">{ecoResult.co2VsCarGrams}</span>
              <span className="text-sm font-semibold text-slate-500 ml-1">gram CO2</span>
            </div>
            <p className="text-xs text-slate-600">
              Berdasarkan faktor emisi mobil kota rata-rata (192g CO2/km di kemacetan Jakarta).
            </p>
          </div>

          {/* Card 2: CO2 vs Motor */}
          <div className="flex flex-col justify-between rounded-2xl border border-teal-100 bg-teal-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Emisi Terhindar vs Motor
              </span>
              <Leaf size={18} className="text-teal-600" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-slate-900">{ecoResult.co2VsMotorGrams}</span>
              <span className="text-sm font-semibold text-slate-500 ml-1">gram CO2</span>
            </div>
            <p className="text-xs text-slate-600">
              Berdasarkan faktor emisi sepeda motor urban (103g CO2/km).
            </p>
          </div>

          {/* Card 3: Calories */}
          <div className="flex flex-col justify-between rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Kalori Terbakar
              </span>
              <HeartPulse size={18} className="text-rose-600" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-slate-900">{ecoResult.caloriesBurnedKcal}</span>
              <span className="text-sm font-semibold text-slate-500 ml-1">kkal (~{ecoResult.stepsCount} langkah)</span>
            </div>
            <p className="text-xs text-slate-600">
              Menjaga kebugaran jantung dan menurunkan risiko penyakit kardiovaskular.
            </p>
          </div>

          {/* Card 4: Trees Equivalent */}
          <div className="flex flex-col justify-between rounded-2xl border border-sky-100 bg-sky-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                Setara Serapan Pohon
              </span>
              <TreePine size={18} className="text-sky-600" />
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-slate-900">{ecoResult.treeDaysEquivalent}</span>
              <span className="text-sm font-semibold text-slate-500 ml-1">hari kerja 1 pohon kota</span>
            </div>
            <p className="text-xs text-slate-600">
              1 pohon pelindung kota rata-rata menyerap ~60 gram karbon per hari.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Route Scenarios */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-base font-black text-slate-900">
          Contoh Rute Komuter Ramah Lingkungan di Jakarta
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          {SAMPLE_ECO_TRIPS.map((trip) => (
            <div
              key={trip.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{trip.label}</h4>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Jarak Tempuh:</span>
                    <span className="font-semibold text-slate-800">{trip.distanceMeters}m ({trip.walkingMinutes} mnt)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pengurangan Karbon:</span>
                    <span className="font-bold text-emerald-600">{trip.co2SavedGramsVsCar}g CO2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kalori Terbakar:</span>
                    <span className="font-bold text-rose-600">{trip.caloriesBurnedKcal} kkal</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCustomDistanceMeters(trip.distanceMeters)}
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                Gunakan Jarak Ini <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
