import { useMemo } from "react";
import { BarChart3, LoaderCircle, Sparkles, X } from "lucide-react";
import type { EChartsOption } from "echarts";
import type { BusinessSpaceCandidate } from "../types/business-space.types";
import type { usePropertyComparison } from "../hooks/use-property-analysis";
import { BusinessSpaceChart } from "./business-space-chart";
import { freshnessLabel, marketValue } from "./property-candidate-detail";

export function PropertyComparison({ candidates, analysis, onRemove }: {
  candidates: BusinessSpaceCandidate[]; analysis: ReturnType<typeof usePropertyComparison>; onRemove: (id: string) => void;
}) {
  const { comparison, compareLoading, compareError, insight, insightLoading, insightError, runCompare, askInsight } = analysis;
  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: "transparent", tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: "#bdd5dd" } }, grid: { left: 40, right: 18, top: 40, bottom: 35 },
    xAxis: { type: "category", data: comparison?.candidates.map((_, i) => `Pilihan ${i + 1}`), axisLabel: { color: "#9fb6bf" } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#9fb6bf" }, splitLine: { lineStyle: { color: "#23383e" } } },
    series: [
      { name: "Permintaan", type: "bar", data: comparison?.candidates.map((item) => item.market_context.status === "AVAILABLE" ? item.market_context.demand_score : null), itemStyle: { color: "#22d3ee" } },
      { name: "Pasokan", type: "bar", data: comparison?.candidates.map((item) => item.market_context.status === "AVAILABLE" ? item.market_context.supply_score : null), itemStyle: { color: "#34d399" } },
    ],
  }), [comparison]);
  return <section className="business-space__comparison" aria-label="Perbandingan properti">
    <header><div><h2>Bandingkan lokasi</h2><p className="bs-muted">Pilih 2–4 properti untuk melihat perbedaan konteks lokasinya. Pilihan tetap tersimpan saat peta digeser.</p></div>
      <button className="bs-button bs-button--primary" type="button" onClick={() => void runCompare()} disabled={candidates.length < 2 || compareLoading}>{compareLoading ? <LoaderCircle className="analytics-spin" size={16} /> : <BarChart3 size={16} />}Bandingkan ({candidates.length}/4)</button>
    </header>
    {candidates.length ? <ul className="bs-comparison-picks">{candidates.map((candidate, index) => <li key={candidate.id}><span><strong>Pilihan {index + 1} · {candidate.property_category || "Properti"}</strong><small>{candidate.address || "Alamat belum tersedia"}</small></span><button type="button" className="bs-button bs-button--icon" aria-label={`Hapus pilihan ${index + 1}`} onClick={() => onRemove(candidate.id)}><X size={16} /></button></li>)}</ul> : null}
    {compareError ? <p className="business-space__error" role="alert">{compareError}</p> : null}
    {comparison ? <>
      {comparison.candidates.some((item) => item.market_context.status === "AVAILABLE") ? <BusinessSpaceChart option={option} label="Skor permintaan dan pasokan di wilayah masing-masing properti" /> : null}
      <div className="business-space__table-wrap" tabIndex={0} role="region" aria-label="Tabel perbandingan lokasi">
        <table><caption>Data wilayah untuk kategori usaha dan periode terpilih</caption><thead><tr><th scope="col">Konteks</th>{comparison.candidates.map((item, i) => <th scope="col" key={item.candidate.id}>Pilihan {i + 1}</th>)}</tr></thead><tbody>
          {[
            { label: "Alamat", values: comparison.candidates.map((item) => item.candidate.address || "Belum tersedia") },
            { label: "Wilayah", values: comparison.candidates.map((item) => item.administrative_context.region_name || "Belum teridentifikasi") },
            { label: "Pembaruan data", values: comparison.candidates.map((item) => freshnessLabel(item.candidate.freshness)) },
            { label: "Akses transportasi", values: comparison.candidates.map((item) => item.transit_context.status === "AVAILABLE" && item.transit_context.nearest ? `${item.transit_context.nearest.name} · ${Math.round(item.transit_context.nearest.network_walking_minutes)} menit berjalan kaki` : "Belum tersedia") },
            { label: "Skor permintaan", values: comparison.candidates.map((item) => marketValue(item, "demand_score")) },
            { label: "Skor pasokan", values: comparison.candidates.map((item) => marketValue(item, "supply_score")) },
            { label: "Selisih kebutuhan", values: comparison.candidates.map((item) => marketValue(item, "retail_gap")) },
          ].map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, i) => <td key={comparison.candidates[i].candidate.id}>{value}</td>)}</tr>)}
        </tbody></table>
      </div>
      <p className="bs-note">Data permintaan dan pasokan menggambarkan wilayah administratif, bukan potensi pendapatan properti. Ketersediaan setiap properti perlu dikonfirmasi.</p>
      <button className="bs-button" type="button" onClick={() => void askInsight()} disabled={insightLoading}>{insightLoading ? <LoaderCircle className="analytics-spin" size={16} /> : <Sparkles size={16} />}Jelaskan perbandingan</button>
      {insightError ? <p className="business-space__error" role="alert">{insightError}</p> : null}
      {insight ? <div className="business-space__insight" role="status"><strong>{insight.status === "AI" ? "Penjelasan berdasarkan data GETRA" : "Ringkasan data yang tersedia"}</strong><p>{insight.answer}</p></div> : null}
    </> : null}
  </section>;
}
