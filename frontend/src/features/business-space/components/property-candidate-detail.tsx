import { Building2, MapPin, Plus, Trash2 } from "lucide-react";
import type { BusinessSpaceCandidateDetail } from "../types/business-space.types";

export function freshnessLabel(value: string) {
  if (value === "FRESH") return "Data terbaru";
  if (value === "AGING") return "Perlu diperiksa kembali";
  if (value === "STALE") return "Perlu konfirmasi ulang";
  return "Tanggal observasi belum tersedia";
}

export function transactionLabel(value: string | null) {
  if (value?.toUpperCase() === "DIJUAL") return "Dijual";
  if (value?.toUpperCase() === "DISEWA") return "Disewa";
  return value || "Transaksi belum diketahui";
}

export function marketValue(detail: BusinessSpaceCandidateDetail, metric: "demand_score" | "supply_score" | "retail_gap") {
  const value = detail.market_context[metric];
  return detail.market_context.status === "AVAILABLE" && value !== null ? String(value) : "Data belum cukup";
}

export function PropertyCandidateDetail({ detail, compared, comparisonFull, onToggle }: {
  detail: BusinessSpaceCandidateDetail; compared: boolean; comparisonFull: boolean; onToggle: () => void;
}) {
  const candidate = detail.candidate;
  const observedAt = candidate.observed_at ? new Date(candidate.observed_at) : null;
  const transit = detail.transit_context.status === "AVAILABLE" ? detail.transit_context.nearest : null;
  return (
    <article className="bs-detail-card" data-candidate-id={candidate.id}>
      <span className="bs-eyebrow">Detail properti</span>
      <header><Building2 size={22} /><div><h2>{candidate.property_category || "Properti"}</h2><span className="bs-badge">{transactionLabel(candidate.property_transaction_type)}</span></div></header>
      <p className="bs-address"><MapPin size={16} />{candidate.address || "Alamat belum tersedia"}</p>
      <button className="bs-button bs-button--primary bs-button--full" type="button" disabled={!compared && comparisonFull} onClick={onToggle}>
        {compared ? <Trash2 size={16} /> : <Plus size={16} />}{compared ? "Hapus dari perbandingan" : comparisonFull ? "Maksimal 4 properti" : "Bandingkan properti"}
      </button>
      <section className="bs-detail-section">
        <h3>Informasi properti</h3>
        <dl>
          <div><dt>Pembaruan data</dt><dd>{freshnessLabel(candidate.freshness)}</dd></div>
          {observedAt && Number.isFinite(observedAt.getTime()) ? <div><dt>Tanggal observasi</dt><dd>{observedAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</dd></div> : null}
          <div><dt>Wilayah</dt><dd>{detail.administrative_context.region_name || "Belum teridentifikasi"}</dd></div>
        </dl>
        <p className="bs-note">Ketersediaan belum dikonfirmasi. Hubungi pemilik atau agen untuk memastikan properti masih ditawarkan.</p>
      </section>
      <section className="bs-detail-section">
        <h3>Akses transportasi</h3>
        {transit ? <p>{transit.name} · {Math.round(transit.network_walking_minutes)} menit berjalan kaki melalui jaringan jalan.</p> : <p className="bs-muted">Data akses transportasi belum tersedia untuk lokasi ini.</p>}
      </section>
      <section className="bs-detail-section">
        <h3>Konteks usaha di wilayah ini</h3>
        {detail.market_context.status === "AVAILABLE" ? <>
          <dl className="bs-metrics"><div><dt>Skor permintaan</dt><dd>{marketValue(detail, "demand_score")}</dd></div><div><dt>Skor pasokan</dt><dd>{marketValue(detail, "supply_score")}</dd></div><div><dt>Selisih kebutuhan</dt><dd>{marketValue(detail, "retail_gap")}</dd></div></dl>
          <p className="bs-note">Konteks tingkat wilayah untuk kategori dan periode terpilih; bukan ukuran permintaan di properti ini.</p>
        </> : <p className="bs-muted">Data permintaan untuk wilayah ini belum cukup.</p>}
        {detail.supply_context.status === "AVAILABLE" && detail.supply_context.comparable_merchant_count !== null ? <p className="bs-note">{detail.supply_context.comparable_merchant_count} usaha sejenis tercatat di sekitar lokasi ini.</p> : null}
      </section>
      <footer className="bs-note">Sumber properti: MAPID · Properti Go</footer>
    </article>
  );
}
