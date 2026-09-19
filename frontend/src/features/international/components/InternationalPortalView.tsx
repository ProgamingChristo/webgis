"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Search,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { GLOBAL_CITIES, INTERNATIONAL_FEATURES } from "../data";
import type { GlobalCityId } from "../types";

export function InternationalPortalView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<GlobalCityId>("tokyo");

  const categories = [
    { id: "ALL", label: "Semua Kategori (50)" },
    { id: "mobility", label: "Mobilitas & Transit" },
    { id: "smart-city", label: "Smart City & IoT" },
    { id: "environment", label: "Lingkungan & Iklim" },
    { id: "safety", label: "Keamanan & Darurat" },
    { id: "commerce", label: "Ekonomi & Turisme" },
    { id: "logistics", label: "Logistik & Kargo" },
    { id: "governance", label: "Tata Kelola & Cagar Budaya" },
  ];

  const filteredFeatures = INTERNATIONAL_FEATURES.filter((f) => {
    const matchesCategory = selectedCategory === "ALL" || f.category === selectedCategory;
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCity = GLOBAL_CITIES.find((c) => c.id === selectedCity) || GLOBAL_CITIES[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Hero Section */}
      <header className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-sky-950/80 to-indigo-950/80 p-8 text-white shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/40">
            <Globe size={14} className="text-cyan-400" /> GETRA Global Geospatial Engine
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-white">
            Portal Smart City & WebGIS Internasional
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300">
            Platform komprehensif 50 modul pemetaan spasial skala dunia: CCTV cerdas, pemantau kemacetan, rute antarmoda, emisi iklim, manajemen tepi jalan, dan integrasi multi-engine basemap dunia.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Fitur Global</span>
              <p className="text-xl font-black text-cyan-400">50 Modul</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Kota Acuan</span>
              <p className="text-xl font-black text-emerald-400">7 Megacity</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Standar Protokol</span>
              <p className="text-xl font-black text-purple-400">GTFS / OGC / AI</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <span className="text-[10px] text-slate-400 uppercase">Multi-Basemap</span>
              <p className="text-xl font-black text-amber-400">OSM + Carto</p>
            </div>
          </div>
        </div>
      </header>

      {/* City Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <MapPin size={16} className="text-cyan-400" />
          <span>Fokus Kota Internasional: {activeCity.name} ({activeCity.flag})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {GLOBAL_CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCity(c.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                selectedCity === c.id
                  ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari fitur internasional (misal: cctv, macet, parkir, karbon, cuaca, wisata)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/90 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition border ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 50 Features Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFeatures.map((feat) => (
          <Link
            key={feat.slug}
            href={`/international/${feat.slug}`}
            className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-cyan-500/10 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase font-mono">
                  {feat.badge}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">{feat.category}</span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition">
                {feat.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {feat.description}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition">
              <span>Buka Modul Fitur</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
