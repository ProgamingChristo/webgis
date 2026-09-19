"use client";

import { useState } from "react";
import {
  Headphones,
  Coins,
  Languages,
  Leaf,
  Moon,
  Music,
  Package,
  FileSpreadsheet,
  Copy,
} from "lucide-react";
import {
  AUDIO_TOUR_SPOTS,
  TAX_REFUND_DATA,
  MARKET_PHRASES,
  CARBON_LISTINGS,
  NIGHTLIFE_DISTRICTS,
  BUSKING_SPOTS,
  CARGO_BIKE_HUBS,
  CUSTOMS_TARIFFS,
} from "../data";

// 16. Tourist Audio Guide View
export function TouristAudioGuideView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-slate-950 via-pink-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-300 border border-pink-500/30">
          <Headphones size={14} className="text-pink-400" /> Geofenced Smart Audio Storytelling
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Panduan Suara Wisata Pejalan Kaki Multibahasa
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Titik narasi sejarah dan kuliner otomatis berbunyi saat wisatawan berjalan melintasi zona cagar budaya dan pasar tradisional.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {AUDIO_TOUR_SPOTS.map((spot) => (
          <div key={spot.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{spot.title}</h3>
              <span className="rounded bg-pink-500/20 text-pink-300 px-2 py-0.5 text-xs font-mono">⭐ {spot.rating}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{spot.snippet}</p>
            <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-800 pt-3">
              <span>Durasi: {spot.durationMinutes} menit</span>
              <div className="flex gap-1.5">
                {spot.languages.map((lang) => (
                  <span key={lang} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300 font-bold">{lang}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 17. Currency & Tax Refund View
export function CurrencyTaxRefundView() {
  const [purchaseAmount, setPurchaseAmount] = useState<number>(10000);
  const [selectedCountryIdx, setSelectedCountryIdx] = useState(0);

  const country = TAX_REFUND_DATA[selectedCountryIdx] || TAX_REFUND_DATA[0];
  const estimatedRefund = (purchaseAmount * (country.standardVatPct / 100)).toFixed(0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
          <Coins size={14} className="text-amber-400" /> Turis & Belanja Bebas Pajak
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Konversi Valas & Kalkulator Pengembalian Pajak (Tax Refund)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Hitung estimasi pengembalian PPN / VAT turis internasional dan temukan konter verifikasi bea cukai terdekat.
        </p>
      </header>

      <div className="flex gap-2">
        {TAX_REFUND_DATA.map((c, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedCountryIdx(idx)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition border ${
              selectedCountryIdx === idx
                ? "bg-amber-500 text-slate-950 border-amber-500"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            {c.country} ({c.currency})
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Total Nilai Belanja ({country.currency}):</label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white font-bold text-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">Tarif Standar VAT:</span>
            <p className="text-xl font-black text-white">{country.standardVatPct}%</p>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-xs text-slate-400">Estimasi Pengembalian Uang:</span>
            <p className="text-2xl font-black text-emerald-400">{country.currency} {estimatedRefund}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs text-slate-300">
          <p><strong>Metode Refund:</strong> {country.refundMethod}</p>
          <p><strong>Konter Bandara:</strong> {country.nearestRefundCounter}</p>
        </div>
      </div>
    </div>
  );
}

// 18. Market Translator View
export function MarketTranslatorView() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copyText(txt: string, idx: number) {
    void navigator.clipboard.writeText(txt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-blue-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
          <Languages size={14} className="text-blue-400" /> Asisten Komunikasi Pedagang & Wisatawan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Penerjemah Tawar-Menawar & Kartu Alergi Makanan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Ungkapan tawar menawar sopan dan kartu alergi makanan darurat dalam 5 bahasa utama untuk kenyamanan berbelanja di pasar lokal UMKM.
        </p>
      </header>

      <div className="space-y-4">
        {MARKET_PHRASES.map((phrase, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="rounded bg-blue-500/20 text-blue-300 px-2 py-0.5 text-[10px] font-bold uppercase">{phrase.category}</span>
              <button
                type="button"
                onClick={() => copyText(phrase.japanese, idx)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition"
              >
                <Copy size={12} /> {copiedIdx === idx ? "Tersalin!" : "Salin Frase"}
              </button>
            </div>
            <p className="text-base font-bold text-white">🇮🇩 {phrase.indonesian}</p>
            <p className="text-sm text-slate-300">🇬🇧 {phrase.english}</p>
            <p className="text-sm text-cyan-300 font-medium">🇯🇵 {phrase.japanese}</p>
            <p className="text-sm text-slate-400">🇨🇳 {phrase.chinese}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 19. Carbon Marketplace View
export function CarbonMarketplaceView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Leaf size={14} className="text-emerald-400" /> Voluntary Carbon Market (VCM)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Bursa Kredit Karbon Pejalan Kaki & Restorasi Urban
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Platform penukaran jejak langkah terverifikasi menjadi token offset karbon yang disalurkan ke proyek reforestasi mangrove dan hutan kota.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CARBON_LISTINGS.map((listing) => (
          <div key={listing.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs font-bold">{listing.registry}</span>
              <span className="text-xl font-black text-emerald-400">${listing.pricePerTonUsd} / Ton CO₂</span>
            </div>
            <h3 className="font-bold text-base text-white">{listing.projectName}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{listing.impactType}</p>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 flex justify-between">
              <span>Tersedia: {listing.availableTons.toLocaleString()} Ton</span>
              <span className="text-cyan-400 font-bold">Verifikasi Blockchain</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 38. Nightlife Zones View
export function NightlifeZonesView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">
          <Moon size={14} className="text-purple-400" /> Ekonomi Malam & Ruang 24 Jam
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Distrik Ekonomi Malam & 24 Jam Terpadu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Kawasan kuliner malam, patroli keamanan pejalan kaki larut malam, dan akses angkutan umum 24 jam.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {NIGHTLIFE_DISTRICTS.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{d.districtName}</h3>
              <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-xs font-mono">Skor Keamanan: {d.safetyScore}/100</span>
            </div>
            <p className="text-xs text-slate-300">{d.vibe}</p>
            <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 space-y-1">
              <p>Outlet Buka Malam: <strong className="text-white">{d.openVenuesCount} Tempat</strong></p>
              <p>Transit 24 Jam: <span className="text-cyan-400">{d.lateNightTransitLines.join(", ")}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 39. Street Performers View
export function StreetPerformersView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-slate-950 via-pink-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-300 border border-pink-500/30">
          <Music size={14} className="text-pink-400" /> Ruang Kreatif Jalanan (Busking Zone)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Panggung Seni Jalanan & Mural Publik
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Titik pertunjukan musisi jalanan berlisensi, jadwal pertunjukan langsung, dan panduan etika ruang publik kreatif.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {BUSKING_SPOTS.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">{b.spotName}</h3>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs">{b.permitStatus}</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <p>Penampil Saat Ini: <strong className="text-cyan-300">{b.currentPerformer || "Buka untuk umum"}</strong></p>
              <p>Genre: {b.genre || "Akustik / Teater Mini"}</p>
              <p className="text-slate-400">Jadwal: {b.upcomingSchedule}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 40. Freight Delivery View
export function FreightDeliveryView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
          <Package size={14} className="text-emerald-400" /> Logistik Bebas Emisi Last-Mile
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Pusat Distribusi Cargo Bike Ramah Lingkungan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Hub konsolidasi paket berbasis sepeda kargo listrik di pusat kota pejalan kaki tanpa polusi suara dan asap knalpot.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CARGO_BIKE_HUBS.map((hub) => (
          <div key={hub.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white">{hub.hubName}</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-800 pt-3">
              <div>Armada: <p className="text-lg font-bold text-cyan-400">{hub.activeCargoBikes} Unit</p></div>
              <div>Paket Hari Ini: <p className="text-lg font-bold text-white">{hub.parcelsDispatchedToday}</p></div>
              <div>CO₂ Terhemat: <p className="text-lg font-bold text-emerald-400">{hub.co2SavedKgToday} kg</p></div>
            </div>
            <p className="text-xs text-slate-400">Radius Layanan: {hub.coverageRadiusKm} km dari Hub</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 43. Customs Tariffs View
export function CustomsTariffsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-slate-950 via-teal-950/70 to-slate-950 p-6 text-white shadow-xl backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300 border border-teal-500/30">
          <FileSpreadsheet size={14} className="text-teal-400" /> Ekspor Produk Kerajinan UMKM
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
          Kalkulator Tarif Bea Cukai Kerajinan UMKM
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Pengecekan kode HS internasional (Harmonized System), bea masuk, dan skema pembebasan pajak untuk kriya dan produk lokal.
        </p>
      </header>

      <div className="space-y-4">
        {CUSTOMS_TARIFFS.map((t) => (
          <div key={t.hsCode} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded bg-teal-500/20 text-teal-300 px-2 py-0.5 text-xs font-mono font-bold">HS {t.hsCode}</span>
              <h3 className="font-bold text-sm text-white">{t.productDescription}</h3>
              <p className="text-xs text-emerald-400">{t.artisanExemptionAvailable ? "✓ Memenuhi Syarat Bebas Bea Masuk Ekspor Kerajinan" : "Tarif Standar"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Bea Masuk / PPN</span>
              <p className="text-lg font-black text-cyan-400">{t.baseDutyPct}% / {t.importVatPct}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
