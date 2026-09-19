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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Headphones size={14} className="text-[#118ab2]" /> Geofenced Smart Audio Storytelling
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Panduan Suara Wisata Pejalan Kaki Multibahasa
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Titik narasi sejarah dan kuliner otomatis berbunyi saat wisatawan berjalan melintasi zona cagar budaya dan pasar tradisional.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {AUDIO_TOUR_SPOTS.map((spot) => (
          <div key={spot.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{spot.title}</h3>
              <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-0.5 text-xs font-mono font-bold">⭐ {spot.rating}</span>
            </div>
            <p className="text-xs leading-relaxed text-[#66708d]">{spot.snippet}</p>
            <div className="flex justify-between items-center text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3">
              <span>Durasi: <strong className="text-[#464b71]">{spot.durationMinutes} menit</strong></span>
              <div className="flex gap-1.5">
                {spot.languages.map((lang) => (
                  <span key={lang} className="rounded-full bg-[#118ab2]/10 px-2.5 py-0.5 text-[10px] text-[#118ab2] font-bold">{lang}</span>
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
      <header className="rounded-3xl border border-[#ffd166]/40 bg-gradient-to-br from-white via-[#fffdfa] to-[#fef9ee] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 border border-amber-500/20">
          <Coins size={14} className="text-amber-600" /> Turis & Belanja Bebas Pajak
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Konversi Valas & Kalkulator Pengembalian Pajak (Tax Refund)
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Hitung estimasi pengembalian PPN / VAT turis internasional dan temukan konter verifikasi bea cukai terdekat.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TAX_REFUND_DATA.map((c, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedCountryIdx(idx)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition border ${
              selectedCountryIdx === idx
                ? "bg-[#118ab2] text-white border-[#118ab2] shadow-sm"
                : "bg-white border-[#464b71]/15 text-[#464b71] hover:bg-[#f8fafc]"
            }`}
          >
            {c.country} ({c.currency})
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-[#464b71]">Total Nilai Belanja ({country.currency}):</label>
          <input
            type="number"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(Number(e.target.value))}
            className="w-full rounded-2xl border border-[#464b71]/15 bg-white p-3.5 text-[#464b71] font-black text-lg focus:border-[#118ab2] focus:outline-hidden shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#464b71]/10 pt-4">
          <div className="space-y-1">
            <span className="text-xs text-[#66708d]">Tarif Standar VAT:</span>
            <p className="text-2xl font-black text-[#464b71]">{country.standardVatPct}%</p>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-xs text-[#66708d]">Estimasi Pengembalian Uang:</span>
            <p className="text-2xl font-black text-emerald-700">{country.currency} {estimatedRefund}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#118ab2]/20 bg-[#f0f9ff] p-4 space-y-2 text-xs text-[#464b71]">
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <Languages size={14} className="text-[#118ab2]" /> Asisten Komunikasi Pedagang & Wisatawan
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Penerjemah Tawar-Menawar & Kartu Alergi Makanan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Ungkapan tawar menawar sopan dan kartu alergi makanan darurat dalam 5 bahasa utama untuk kenyamanan berbelanja di pasar lokal UMKM.
        </p>
      </header>

      <div className="space-y-4">
        {MARKET_PHRASES.map((phrase, idx) => (
          <div key={idx} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="rounded-full bg-[#118ab2]/10 text-[#118ab2] px-3 py-0.5 text-[10px] font-bold uppercase">{phrase.category}</span>
              <button
                type="button"
                onClick={() => copyText(phrase.japanese, idx)}
                className="flex items-center gap-1 text-xs text-[#66708d] hover:text-[#118ab2] font-semibold transition"
              >
                <Copy size={12} /> {copiedIdx === idx ? "Tersalin!" : "Salin Frase"}
              </button>
            </div>
            <p className="text-base font-black text-[#464b71]">🇮🇩 {phrase.indonesian}</p>
            <p className="text-sm text-[#66708d]">🇬🇧 {phrase.english}</p>
            <p className="text-sm text-[#118ab2] font-bold">🇯🇵 {phrase.japanese}</p>
            <p className="text-sm text-[#66708d]">🇨🇳 {phrase.chinese}</p>
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
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Leaf size={14} className="text-emerald-600" /> Voluntary Carbon Market (VCM)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Bursa Kredit Karbon Pejalan Kaki & Restorasi Urban
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Platform penukaran jejak langkah terverifikasi menjadi token offset karbon yang disalurkan ke proyek reforestasi mangrove dan hutan kota.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CARBON_LISTINGS.map((listing) => (
          <div key={listing.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">{listing.registry}</span>
              <span className="text-xl font-black text-emerald-700">${listing.pricePerTonUsd} / Ton CO₂</span>
            </div>
            <h3 className="font-black text-base text-[#464b71]">{listing.projectName}</h3>
            <p className="text-xs text-[#66708d] leading-relaxed">{listing.impactType}</p>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3 flex justify-between font-medium">
              <span>Tersedia: {listing.availableTons.toLocaleString()} Ton</span>
              <span className="text-[#118ab2] font-bold">Verifikasi Spasial</span>
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
      <header className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-white via-[#faf5ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3.5 py-1 text-xs font-bold text-purple-700 border border-purple-500/20">
          <Moon size={14} className="text-purple-600" /> Ekonomi Malam & Ruang 24 Jam
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Distrik Ekonomi Malam & 24 Jam Terpadu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Kawasan kuliner malam, patroli keamanan pejalan kaki larut malam, dan akses angkutan umum 24 jam.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {NIGHTLIFE_DISTRICTS.map((d) => (
          <div key={d.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{d.districtName}</h3>
              <span className="rounded-full bg-purple-100 text-purple-800 px-3 py-0.5 text-xs font-mono font-bold">Skor Keamanan: {d.safetyScore}/100</span>
            </div>
            <p className="text-xs text-[#66708d]">{d.vibe}</p>
            <div className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-3 space-y-1">
              <p>Outlet Buka Malam: <strong className="text-[#464b71]">{d.openVenuesCount} Tempat</strong></p>
              <p>Transit 24 Jam: <span className="text-[#118ab2] font-semibold">{d.lateNightTransitLines.join(", ")}</span></p>
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
      <header className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-white via-[#fff5f5] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-700 border border-rose-500/20">
          <Music size={14} className="text-rose-600" /> Ruang Kreatif Jalanan (Busking Zone)
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Panggung Seni Jalanan & Mural Publik
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Titik pertunjukan musisi jalanan berlisensi, jadwal pertunjukan langsung, dan panduan etika ruang publik kreatif.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {BUSKING_SPOTS.map((b) => (
          <div key={b.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-base text-[#464b71]">{b.spotName}</h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">{b.permitStatus}</span>
            </div>
            <div className="text-xs text-[#66708d] space-y-1.5">
              <p>Penampil: <strong className="text-[#118ab2]">{b.currentPerformer || "Buka untuk umum"}</strong></p>
              <p>Genre: {b.genre || "Akustik / Teater Mini"}</p>
              <p className="border-t border-[#464b71]/10 pt-2">Jadwal: {b.upcomingSchedule}</p>
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
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-white via-[#f0fdfa] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
          <Package size={14} className="text-emerald-600" /> Logistik Bebas Emisi Last-Mile
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Pusat Distribusi Cargo Bike Ramah Lingkungan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Hub konsolidasi paket berbasis sepeda kargo listrik di pusat kota pejalan kaki tanpa polusi suara dan asap knalpot.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CARGO_BIKE_HUBS.map((hub) => (
          <div key={hub.id} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] space-y-4">
            <h3 className="font-black text-base text-[#464b71]">{hub.hubName}</h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-[#464b71]/10 pt-3">
              <div>Armada: <p className="text-lg font-black text-[#118ab2]">{hub.activeCargoBikes} Unit</p></div>
              <div>Paket Hari Ini: <p className="text-lg font-black text-[#464b71]">{hub.parcelsDispatchedToday}</p></div>
              <div>CO₂ Terhemat: <p className="text-lg font-black text-emerald-700">{hub.co2SavedKgToday} kg</p></div>
            </div>
            <p className="text-xs text-[#66708d] border-t border-[#464b71]/10 pt-2">Radius Layanan: {hub.coverageRadiusKm} km dari Hub</p>
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
      <header className="rounded-3xl border border-[#118ab2]/20 bg-gradient-to-br from-white via-[#f0f9ff] to-[#f8fafc] p-6 text-[#464b71] shadow-[0_10px_24px_rgba(70,75,113,0.06)]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#118ab2]/10 px-3.5 py-1 text-xs font-bold text-[#118ab2] border border-[#118ab2]/20">
          <FileSpreadsheet size={14} className="text-[#118ab2]" /> Ekspor Produk Kerajinan UMKM
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-[#464b71]">
          Kalkulator Tarif Bea Cukai Kerajinan UMKM
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#66708d]">
          Pengecekan kode HS internasional (Harmonized System), bea masuk, dan skema pembebasan pajak untuk kriya dan produk lokal.
        </p>
      </header>

      <div className="space-y-4">
        {CUSTOMS_TARIFFS.map((t) => (
          <div key={t.hsCode} className="rounded-3xl border border-[#464b71]/15 bg-white p-6 shadow-[0_10px_24px_rgba(70,75,113,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="rounded-full bg-[#118ab2]/10 text-[#118ab2] px-3 py-0.5 text-xs font-mono font-bold">HS {t.hsCode}</span>
              <h3 className="font-black text-sm text-[#464b71]">{t.productDescription}</h3>
              <p className="text-xs text-emerald-700 font-semibold">{t.artisanExemptionAvailable ? "✓ Memenuhi Syarat Bebas Bea Masuk Ekspor Kerajinan" : "Tarif Standar"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#66708d]">Bea Masuk / PPN</span>
              <p className="text-lg font-black text-[#118ab2]">{t.baseDutyPct}% / {t.importVatPct}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
