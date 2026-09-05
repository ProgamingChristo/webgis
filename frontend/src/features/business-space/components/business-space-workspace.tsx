"use client";

import { useMemo, useState } from "react";
import { Building2, LoaderCircle, MapPin, RefreshCcw, Search } from "lucide-react";
import type { BusinessCategorySlug, BusinessSpaceCandidate } from "../types/business-space.types";
import { usePropertyCandidates } from "../hooks/use-property-candidates";
import { usePropertyComparison, usePropertyDetail } from "../hooks/use-property-analysis";
import { BusinessSpaceMap } from "./business-space-map";
import { freshnessLabel, PropertyCandidateDetail, transactionLabel } from "./property-candidate-detail";
import { PropertyComparison } from "./property-comparison";

const CATEGORIES: { slug: BusinessCategorySlug; label: string }[] = [
  { slug: "bakso", label: "Bakso" }, { slug: "coffee", label: "Kopi / Kafe" },
  { slug: "nasi-goreng", label: "Nasi Goreng" }, { slug: "restaurant", label: "Restoran" },
  { slug: "warung", label: "Warung" }, { slug: "minimarket", label: "Minimarket" },
];

export function BusinessSpaceWorkspace() {
  const [category, setCategory] = useState<BusinessCategorySlug>("bakso");
  const [days, setDays] = useState<7 | 30>(30);
  const [query, setQuery] = useState("");
  const [propertyCategory, setPropertyCategory] = useState("");
  const [transaction, setTransaction] = useState<"" | "DIJUAL" | "DISEWA">("");
  const properties = usePropertyCandidates({ category, days, q: query, property_category: propertyCategory, transaction_type: transaction || undefined });
  const { candidates, loading, error, viewport, viewportTooWide, onViewportChange, refresh, loadMore, loadingMore, hasMore, refineArea, searchTruncated } = properties;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visibleSelectedId = candidates.some((item) => item.id === selectedId) ? selectedId : null;
  const { detail, loading: detailLoading, error: detailError } = usePropertyDetail(visibleSelectedId, category, days);
  const [comparisonPicks, setComparisonPicks] = useState<BusinessSpaceCandidate[]>([]);
  const comparisonIds = useMemo(() => comparisonPicks.map((item) => item.id), [comparisonPicks]);
  const analysis = usePropertyComparison(comparisonIds, category, days);

  function toggleComparison(candidate: BusinessSpaceCandidate) {
    setComparisonPicks((current) => current.some((item) => item.id === candidate.id)
      ? current.filter((item) => item.id !== candidate.id)
      : current.length < 4 ? [...current, candidate] : current);
  }

  return <main className="business-space" data-category={category} data-days={days}>
    <header className="business-space__top"><div><span className="bs-eyebrow">Properti Go</span><h1>Temukan properti di sekitar peta</h1><p>Geser atau perbesar peta. Properti yang tersedia dalam data Properti Go akan muncul otomatis di area yang terlihat.</p></div>
      <button className="bs-button" type="button" onClick={refresh} disabled={loading || !viewport || viewportTooWide}><RefreshCcw size={16} />Muat ulang</button>
    </header>
    <section className="business-space__controls" aria-label="Filter Properti Go">
      <label className="bs-search-field"><span>Cari dalam area peta</span><span className="bs-search-input"><Search size={16} /><input className="bs-field" type="search" placeholder="Alamat atau kata kunci properti" value={query} onChange={(event) => setQuery(event.target.value)} /></span></label>
      <label><span>Jenis properti</span><select className="bs-field" value={propertyCategory} onChange={(event) => setPropertyCategory(event.target.value)}><option value="">Semua jenis</option>{["Rumah", "Tanah", "Ruko", "Gudang", "Apartemen", "Kantor"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label><span>Penawaran</span><select className="bs-field" value={transaction} onChange={(event) => setTransaction(event.target.value as typeof transaction)}><option value="">Dijual & disewa</option><option value="DIJUAL">Dijual</option><option value="DISEWA">Disewa</option></select></label>
    </section>
    <div className="bs-area-status" role="status"><MapPin size={15} /><span>{!viewport ? "Menyiapkan peta…" : viewportTooWide ? "Perbesar peta untuk melihat properti di area yang lebih dekat." : loading ? "Memuat properti di area peta…" : `${candidates.length} properti ditampilkan · Mengikuti area peta`}</span></div>
    <section className="business-space__layout">
      <aside className="business-space__candidates" aria-label="Properti di area peta" aria-busy={loading}>
        <div className="bs-panel-heading"><h2>Properti di area ini</h2><span className="bs-badge">{candidates.length}</span></div>
        {error ? <p className="business-space__error" role="alert">{error}</p> : null}
        {!viewport ? <p className="bs-empty">Menyiapkan peta…</p> : viewportTooWide ? <p className="bs-empty">Area terlalu luas. Perbesar peta untuk memuat properti.</p> : loading && !candidates.length ? <p className="bs-empty" role="status"><LoaderCircle className="analytics-spin" size={20} />Mencari properti di area ini…</p> : !error && !loading && !candidates.length ? <div className="bs-empty"><Building2 size={26} /><h3>{searchTruncated ? "Persempit area pencarian" : "Belum ada properti di area ini"}</h3><p>{searchTruncated ? "Pencarian belum mencakup seluruh data. Perbesar peta atau sesuaikan filter." : "Coba geser peta atau sesuaikan filter. Hanya properti yang tercatat di Properti Go yang ditampilkan."}</p></div> : null}
        {candidates.map((candidate, index) => <button key={candidate.id} type="button" data-candidate-id={candidate.id} aria-pressed={visibleSelectedId === candidate.id} className={visibleSelectedId === candidate.id ? "bs-candidate bs-candidate--active" : "bs-candidate"} onClick={() => setSelectedId(candidate.id)}>
          <span className="bs-candidate__number">P{index + 1}</span><span className="bs-candidate__content"><strong>{candidate.property_category || "Properti"} <span className="bs-candidate__transaction">· {transactionLabel(candidate.property_transaction_type)}</span></strong><span className="bs-candidate__address">{candidate.address || "Alamat belum tersedia"}</span><small>{freshnessLabel(candidate.freshness)}</small></span>
        </button>)}
        {hasMore ? <button className="bs-button bs-button--full" type="button" onClick={loadMore} disabled={loading || loadingMore}>{loadingMore ? "Memuat…" : "Tampilkan lebih banyak"}</button> : null}
        {refineArea ? <p className="bs-note">Masih ada data yang belum ditampilkan. Perbesar area peta atau gunakan filter yang lebih spesifik.</p> : null}
        {candidates.length ? <p className="bs-note">Ketersediaan properti perlu dikonfirmasi kepada pemilik atau agen.</p> : null}
      </aside>
      <BusinessSpaceMap candidates={candidates} selectedId={visibleSelectedId} comparison={analysis.comparison?.candidates ?? []} onSelect={setSelectedId} onViewportChange={onViewportChange} />
      <aside className="business-space__detail" aria-label="Detail properti terpilih" aria-busy={detailLoading}>
        {detailLoading ? <p className="bs-empty" role="status"><LoaderCircle className="analytics-spin" size={20} />Memuat detail lokasi…</p> : detailError ? <p className="business-space__error" role="alert">{detailError}</p> : detail ? <PropertyCandidateDetail detail={detail} compared={comparisonIds.includes(detail.candidate.id)} comparisonFull={comparisonIds.length >= 4} onToggle={() => toggleComparison(detail.candidate)} /> : <div className="bs-empty"><MapPin size={28} /><h2>Lihat detail properti</h2><p>Pilih titik pada peta atau salah satu properti di daftar untuk melihat informasi lokasi.</p></div>}
      </aside>
    </section>
    <section className="bs-analysis-controls" aria-label="Pengaturan analisis lokasi"><div><h2>Konteks untuk rencana usaha</h2><p className="bs-muted">Kategori dan periode ini digunakan untuk informasi wilayah serta perbandingan lokasi.</p></div><label><span>Kategori usaha</span><select className="bs-field" value={category} onChange={(event) => setCategory(event.target.value as BusinessCategorySlug)}>{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label><label><span>Periode data</span><select className="bs-field" value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30)}><option value={7}>7 hari</option><option value={30}>30 hari</option></select></label></section>
    <PropertyComparison candidates={comparisonPicks} analysis={analysis} onRemove={(id) => setComparisonPicks((current) => current.filter((item) => item.id !== id))} />
  </main>;
}
