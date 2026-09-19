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
      <header className="relative overflow-hidden rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-8 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#118ab2]/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#118ab2] border border-[#118ab2]/20">
            <Globe size={14} className="text-[#118ab2]" /> GETRA Global Geospatial Engine
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-[#464b71]">
            Portal Smart City & WebGIS Internasional
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-[#66708d]">
            Platform komprehensif 50 modul pemetaan spasial skala dunia: CCTV cerdas, pemantau kemacetan, rute antarmoda, emisi iklim, manajemen tepi jalan, dan integrasi multi-engine basemap dunia.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-2xl border border-[#464b71]/10 bg-white p-3.5 shadow-sm">
              <span className="text-[10px] text-[#66708d] font-bold uppercase">Fitur Global</span>
              <p className="text-xl font-black text-[#118ab2]">50 Modul</p>
            </div>
            <div className="rounded-2xl border border-[#464b71]/10 bg-white p-3.5 shadow-sm">
              <span className="text-[10px] text-[#66708d] font-bold uppercase">Kota Acuan</span>
              <p className="text-xl font-black text-[#0f766e]">7 Megacity</p>
            </div>
            <div className="rounded-2xl border border-[#464b71]/10 bg-white p-3.5 shadow-sm">
              <span className="text-[10px] text-[#66708d] font-bold uppercase">Standar Protokol</span>
              <p className="text-xl font-black text-[#464b71]">GTFS / OGC / AI</p>
            </div>
            <div className="rounded-2xl border border-[#464b71]/10 bg-white p-3.5 shadow-sm">
              <span className="text-[10px] text-[#66708d] font-bold uppercase">Multi-Basemap</span>
              <p className="text-xl font-black text-[#b45309]">OSM + Carto</p>
            </div>
          </div>
        </div>
      </header>

      {/* City Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#464b71]/15 bg-white p-4 shadow-[0_4px_12px_rgba(70,75,113,0.04)]">
        <div className="flex items-center gap-2 text-xs font-bold text-[#464b71]">
          <MapPin size={16} className="text-[#118ab2]" />
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
                  ? "bg-[#118ab2] text-white border-[#118ab2] shadow-sm"
                  : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f0f9ff]"
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
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66708d]" />
            <input
              type="text"
              placeholder="Cari fitur internasional (misal: cctv, macet, parkir, karbon, cuaca, wisata)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[#464b71]/15 bg-white py-3 pl-10 pr-4 text-sm text-[#464b71] placeholder-[#66708d]/60 focus:border-[#118ab2] focus:outline-hidden shadow-sm"
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
                  ? "bg-[#118ab2] text-white border-[#118ab2] shadow-sm"
                  : "bg-white text-[#464b71] border-[#464b71]/15 hover:border-[#118ab2]/40"
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
            className="group rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#118ab2]/40 hover:shadow-[0_14px_30px_rgba(17,138,178,0.12)] flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-[#118ab2]/10 border border-[#118ab2]/20 px-2 py-0.5 text-[10px] font-bold text-[#118ab2] uppercase font-mono">
                  {feat.badge}
                </span>
                <span className="text-[10px] font-bold text-[#66708d] uppercase">{feat.category}</span>
              </div>
              <h3 className="text-base font-black text-[#464b71] group-hover:text-[#118ab2] transition">
                {feat.title}
              </h3>
              <p className="text-xs leading-relaxed text-[#66708d]">
                {feat.description}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-[#464b71]/10 pt-3 text-xs font-bold text-[#118ab2] group-hover:translate-x-0.5 transition">
              <span>Buka Modul Fitur</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
