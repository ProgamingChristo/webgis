"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useUmkmInsightExplanation } from "@/src/features/umkm-intelligence/hooks/use-umkm-insight-explanation";
import type { UmkmIntelligenceResult } from "@/src/features/umkm-intelligence/types/umkm-intelligence.types";
import type { MerchantInsightPanelProps } from "./merchant-visibility-panel";

interface MerchantOpportunityPanelProps extends MerchantInsightPanelProps {
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
}

export function MerchantOpportunityPanel({ merchantId, intelligence, days, onDaysChange }: MerchantOpportunityPanelProps) {
  const explanation = useUmkmInsightExplanation(merchantId, days, intelligence.data);
  const data = intelligence.data?.merchant.id === merchantId ? intelligence.data : null;
  const market = data?.market_context;
  const hasMarketEvidence = market?.status === "AVAILABLE";

  return (
    <section className="space-y-6" aria-labelledby="merchant-opportunity-title" data-merchant-id={merchantId} data-window-days={days}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900" id="merchant-opportunity-title">Peluang di Sekitar</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Apa yang sedang dibutuhkan orang di sekitar usaha Anda?</p>
        </div>
        <fieldset className="shrink-0"><legend className="mb-2 text-xs font-medium text-slate-500">Periode pengamatan</legend><div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm">
          {([7, 30] as const).map((period) => <button key={period} type="button" aria-pressed={days === period} onClick={() => onDaysChange(period)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${days === period ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{period} hari</button>)}
        </div></fieldset>
      </header>
      {intelligence.loading ? <p className="text-sm text-slate-500" role="status">Memuat kebutuhan di wilayah usaha...</p> : null}
      {intelligence.error ? <p className="text-sm text-rose-600" role="alert">{intelligence.error}</p> : null}
      {data && market ? <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-slate-900">{getMarketSummary(data)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{market.area
            ? `Kategori ${data.merchant.category} di ${market.area.name}. Data mencakup wilayah kota administratif, bukan radius langsung di sekitar toko.`
            : `Wilayah pengamatan untuk ${data.merchant.name} belum tersedia.`}</p>
          {market.window ? <p className="mt-2 text-xs text-slate-500">{formatDate(market.window.start_at)} – {formatDate(market.window.end_at)}</p> : null}
          {hasMarketEvidence ? <>
            <dl className="mt-5 grid gap-4 border-y border-slate-100 py-4 sm:grid-cols-3">
              <MarketMetric label="Indeks kebutuhan" value={market.demand_score} description="Aktivitas yang tercatat di GETRA" />
              <MarketMetric label="Indeks ketersediaan usaha" value={market.supply_score} description="Usaha yang tercatat di GETRA" />
              <MarketMetric label="Selisih kebutuhan dan ketersediaan" value={market.retail_gap} description="Perbandingan kedua indeks" />
            </dl>
            <p className="mt-3 text-xs leading-5 text-slate-600">{confidenceLabel(market.confidence)}. Indeks ini menggambarkan sinyal yang diamati GETRA, bukan jumlah calon pelanggan atau perkiraan omzet.</p>
          </> : <p className="mt-3 text-sm leading-6 text-slate-600">Bukti yang tersedia belum cukup untuk menyimpulkan kebutuhan pasar atau persaingan. Anda tetap dapat membaca permintaan komuter dan menilai mana yang sesuai dengan usaha Anda.</p>}
          {market.raw_counts ? <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-800">Kebutuhan yang tercatat</h4>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-3">
              <SignalCount label="Pencarian" value={market.raw_counts.search_events} />
              <SignalCount label="Permintaan rute" value={market.raw_counts.route_requests} />
              <SignalCount label="Permintaan komuter" value={market.raw_counts.commuter_requests} />
              <SignalCount label="Catatan transaksi" value={market.raw_counts.transaction_observations} />
              <SignalCount label="Interaksi promosi" value={market.raw_counts.campaign_interactions} />
              <SignalCount label="Usaha dalam data wilayah" value={market.raw_counts.canonical_merchants} />
            </dl>
            <p className="mt-3 text-xs leading-5 text-slate-500">Jumlah aktivitas tidak sama dengan jumlah orang. Semua angka mengikuti kategori, wilayah, dan periode pengamatan di atas.</p>
          </div> : null}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <button type="button" disabled={explanation.loading} onClick={() => void explanation.explain()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 sm:w-auto"><Sparkles size={16} aria-hidden="true" />{explanation.loading ? "Menyiapkan penjelasan..." : "Jelaskan peluang"}</button>
            <p className="mt-2 text-xs leading-5 text-slate-600">Apa artinya untuk usaha saya? Penjelasan menggunakan data GETRA yang tersedia.</p>
            {explanation.data ? <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4" role="status"><p className="text-xs font-bold text-sky-900">Penjelasan dari data GETRA</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">{explanation.data.answer}</p></div> : null}
            {explanation.error ? <p className="mt-3 text-sm text-rose-600" role="alert">{explanation.error}</p> : null}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-bold text-slate-900">Kenali usaha sejenis</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{data.nearby_similar_merchants.length > 0
            ? `${data.nearby_similar_merchants.length} usaha sejenis ditampilkan di wilayah yang sama (maksimal 20). Daftar ini membantu mengenali pilihan yang tersedia, dan belum memastikan usaha tersebut menjadi pesaing langsung.`
            : "Daftar usaha sejenis belum tersedia untuk wilayah ini. Hal ini tidak berarti tidak ada pesaing."}</p>
          {data.nearby_similar_merchants.length > 0 ? <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">{data.nearby_similar_merchants.map((merchant) => <li className="min-w-0 border-b border-slate-100 py-3" key={merchant.id}><strong className="block break-words text-sm font-semibold text-slate-900">{merchant.name}</strong><span className="text-xs text-slate-500">{merchant.category}</span></li>)}</ul> : null}
        </section>
      </> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-bold text-slate-900">Dengarkan permintaan komuter</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Lihat apa yang dicari komuter dan berikan respons jika usaha Anda dapat membantu. Daftar permintaan ini belum disaring berdasarkan lokasi usaha yang dipilih.</p>
        <Link href="/community?view=requests" className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 sm:w-auto">Lihat Permintaan Komuter<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>
    </section>
  );
}

function getMarketSummary(data: UmkmIntelligenceResult) {
  const market = data.market_context;
  if (market.status !== "AVAILABLE" || market.retail_gap === null) return "Kebutuhan sekitar belum dapat disimpulkan";
  if (market.retail_gap > 0) return "Ada kebutuhan yang dapat ditelusuri lebih lanjut";
  if (market.retail_gap < 0) return "Pelajari pilihan yang sudah tersedia di wilayah ini";
  return "Kebutuhan dan ketersediaan tercatat pada tingkat yang seimbang";
}

function MarketMetric({ label, value, description }: { label: string; value: number | null; description: string }) {
  return <div><dt className="text-xs font-medium leading-5 text-slate-500">{label}</dt><dd className="mt-1 text-xl font-bold text-slate-900">{value === null ? "Belum tersedia" : value.toLocaleString("id-ID")}</dd><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>;
}

function SignalCount({ label, value }: { label: string; value: number }) {
  return <div><dt className="text-xs font-medium leading-5 text-slate-500">{label}</dt><dd className="mt-1 text-base font-bold text-slate-900">{value.toLocaleString("id-ID")}</dd></div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function confidenceLabel(value: UmkmIntelligenceResult["market_context"]["confidence"]) {
  return ({ INSUFFICIENT_DATA: "Bukti belum cukup", LIMITED_EVIDENCE: "Bukti masih terbatas", MODERATE_EVIDENCE: "Bukti cukup tersedia", STRONGER_EVIDENCE: "Bukti lebih kuat", UNAVAILABLE: "Bukti belum tersedia" })[value];
}
