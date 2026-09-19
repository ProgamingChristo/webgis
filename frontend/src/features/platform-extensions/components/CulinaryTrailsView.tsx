"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Footprints, Clock, ArrowRight, Utensils } from "lucide-react";
import { CULINARY_TRAILS } from "../data";

export function CulinaryTrailsView() {
  const [selectedTrailId, setSelectedTrailId] = useState<string>(CULINARY_TRAILS[0].id);

  const selectedTrail =
    CULINARY_TRAILS.find((t) => t.id === selectedTrailId) || CULINARY_TRAILS[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Intro Banner */}
      <section className="rounded-2xl border border-amber-100 bg-gradient-to-r from-orange-950 to-amber-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Compass size={14} /> Wisata Gastronomi & Warisan Rasa
            </span>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Rute Wisata Kuliner Pejalan Kaki Jakarta
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-amber-100">
              Jelajahi kelezatan legendaris ibu kota melalui rute terkurasi yang ramah pejalan kaki, lengkap dengan petunjuk langkah demi langkah antar pedagang.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-400 transition"
            >
              <Utensils size={16} /> Buka Navigator Rute
            </Link>
          </div>
        </div>
      </section>

      {/* Main Trail Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Trail Selector */}
        <div className="space-y-3 lg:col-span-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
            Pilihan Rute Gastronomi ({CULINARY_TRAILS.length})
          </h2>

          <div className="space-y-3">
            {CULINARY_TRAILS.map((trail) => {
              const isSelected = trail.id === selectedTrail.id;
              return (
                <button
                  key={trail.id}
                  type="button"
                  onClick={() => setSelectedTrailId(trail.id)}
                  className={`w-full text-left rounded-2xl border p-5 transition ${
                    isSelected
                      ? "border-amber-500 bg-amber-50/60 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="text-[11px] font-bold text-amber-700 uppercase">
                    {trail.theme}
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-snug mt-1">
                    {trail.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{trail.description}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <Footprints size={13} className="text-amber-600" /> {trail.totalDistanceKm} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-amber-600" /> ~{trail.estimatedMinutes} menit
                    </span>
                    <span className="flex items-center gap-1">
                      <Utensils size={13} className="text-amber-600" /> {trail.stopsCount} warung
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Trail Itinerary */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Rencana Perjalanan
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">{selectedTrail.title}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{selectedTrail.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedTrail.highlightFood.map((food, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200"
                >
                  ✨ {food}
                </span>
              ))}
            </div>

            {/* Waypoint steps */}
            <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
                Pemberhentian Terjadwal ({selectedTrail.stops.length} Titik)
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200">
                {selectedTrail.stops.map((stop) => (
                  <div key={stop.step} className="relative">
                    {/* Bullet marker */}
                    <div className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-black text-white ring-4 ring-white">
                      {stop.step}
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{stop.merchantName}</h4>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                          +{stop.distanceFromPrevMeters}m jalan
                        </span>
                      </div>
                      <p className="text-xs font-bold text-amber-800 mt-0.5">
                        Sajian Unggulan: {stop.dishName}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{stop.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-4 flex justify-end">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
              >
                Mulai Petualangan Kuliner Ini <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
