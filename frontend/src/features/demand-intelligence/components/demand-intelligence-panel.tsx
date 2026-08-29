"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { BarChart3, BrainCircuit, Info, LoaderCircle } from "lucide-react";
import { demandIntelligenceService } from "../services/demand-intelligence.service";
import type {
  AnalyticsInterpretation,
  AnalyticsMode,
  AnalyticsQuery,
  AnalyticsRow,
  DemandIntelligenceResult,
} from "../types/demand-intelligence.types";
import { AnalyticsChart } from "./analytics-chart";

const CONFIDENCE_LABELS = {
  INSUFFICIENT_DATA: "Data belum cukup",
  LIMITED_EVIDENCE: "Bukti terbatas",
  MODERATE_EVIDENCE: "Bukti moderat",
  STRONGER_EVIDENCE: "Bukti lebih kuat",
} as const;

export function DemandIntelligencePanel({
  query,
  data,
  loading,
  error,
  selectedRegionId,
  onModeChange,
  onCategoryChange,
  onDaysChange,
  onSelectRegion,
}: {
  query: AnalyticsQuery;
  data: DemandIntelligenceResult | null;
  loading: boolean;
  error: string | null;
  selectedRegionId: string | null;
  onModeChange: (mode: AnalyticsMode) => void;
  onCategoryChange: (category: AnalyticsQuery["category"]) => void;
  onDaysChange: (days: 7 | 30) => void;
  onSelectRegion: (regionId: string) => void;
}) {
  const selected = data?.rows.find((row) => row.spatial_unit.id === selectedRegionId) ?? data?.rows[0] ?? null;
  const [interpretation, setInterpretation] = useState<AnalyticsInterpretation | null>(null);
  const [interpretationKey, setInterpretationKey] = useState<string | null>(null);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);

  const currentInterpretationKey = JSON.stringify([query, selected?.spatial_unit.id ?? null]);
  const visibleInterpretation = interpretationKey === currentInterpretationKey ? interpretation : null;
  const visibleInterpretationError = interpretationKey === currentInterpretationKey ? interpretationError : null;

  const demandSupplyOption = useMemo<EChartsOption>(() => ({
    animationDuration: 300,
    backgroundColor: "transparent",
    grid: { left: 34, right: 10, top: 28, bottom: 52 },
    legend: { top: 0, textStyle: { color: "#bdd5dd", fontSize: 9 } },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: data?.rows.map((row) => shortRegion(row.spatial_unit.name)) ?? [], axisLabel: { color: "#9fb6bf", rotate: 22, fontSize: 9 } },
    yAxis: { type: "value", min: 0, max: 100, name: "Skor 0-100", nameTextStyle: { color: "#8ca5ae", fontSize: 9 }, axisLabel: { color: "#8ca5ae", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(148, 180, 190, .12)" } } },
    series: [
      { name: "Demand", type: "bar", data: data?.rows.map((row) => row.demand_score) ?? [], itemStyle: { color: "#22d3ee" } },
      { name: "Supply", type: "bar", data: data?.rows.map((row) => row.supply_score) ?? [], itemStyle: { color: "#a3e635" } },
    ],
  }), [data]);

  const gapOption = useMemo<EChartsOption>(() => ({
    animationDuration: 300,
    backgroundColor: "transparent",
    grid: { left: 38, right: 12, top: 16, bottom: 52 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: data?.rows.map((row) => shortRegion(row.spatial_unit.name)) ?? [], axisLabel: { color: "#9fb6bf", rotate: 22, fontSize: 9 } },
    yAxis: { type: "value", min: -100, max: 100, name: "Gap relatif", nameTextStyle: { color: "#8ca5ae", fontSize: 9 }, axisLabel: { color: "#8ca5ae", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(148, 180, 190, .12)" } } },
    series: [{
      name: "Retail Gap",
      type: "bar",
      data: data?.rows.map((row) => ({
        value: row.retail_gap,
        itemStyle: { color: row.retail_gap === null ? "#64748b" : row.retail_gap >= 0 ? "#84cc16" : "#fb7185" },
      })) ?? [],
    }],
  }), [data]);

  const sourceOption = useMemo<EChartsOption>(() => {
    const counts = selected?.raw_counts;
    return {
      animationDuration: 300,
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      legend: { bottom: 0, textStyle: { color: "#bdd5dd", fontSize: 8 } },
      series: [{
        name: "Raw signal count",
        type: "pie",
        radius: ["34%", "62%"],
        center: ["50%", "42%"],
        label: { color: "#d5e5e9", fontSize: 9 },
        data: counts ? [
          { name: "Search", value: counts.search_events },
          { name: "Route", value: counts.route_requests },
          { name: "Commuter", value: counts.commuter_requests },
          { name: "Struk obs.", value: counts.transaction_observations },
        ].filter((item) => item.value > 0) : [],
      }],
    };
  }, [selected]);

  async function explain() {
    if (!selected) return;
    setInterpretationKey(currentInterpretationKey);
    setInterpretationLoading(true);
    setInterpretationError(null);
    try {
      setInterpretation(await demandIntelligenceService.interpret(query, selected.spatial_unit.id));
    } catch (cause) {
      setInterpretationError(cause instanceof Error ? cause.message : "Interpretasi tidak tersedia.");
    } finally {
      setInterpretationLoading(false);
    }
  }

  return (
    <section
      className="demand-intelligence"
      aria-labelledby="demand-intelligence-title"
      data-analytics-mode={query.mode}
      data-analytics-category={query.category}
      data-analytics-row-count={data?.rows.length ?? 0}
    >
      <header className="demand-intelligence__header">
        <div><span className="eyebrow">Observed analytics</span><h3 id="demand-intelligence-title">Demand Intelligence</h3></div>
        <BarChart3 size={18} aria-hidden="true" />
      </header>

      <div className="analytics-segments" aria-label="Mode analytics">
        <button type="button" aria-pressed={query.mode === "DEMAND"} onClick={() => onModeChange("DEMAND")}>Demand</button>
        <button type="button" aria-pressed={query.mode === "RETAIL_GAP"} onClick={() => onModeChange("RETAIL_GAP")}>Retail Gap</button>
      </div>

      <div className="analytics-filters">
        <label><span>Kategori</span><select value={query.category} onChange={(event) => onCategoryChange(event.target.value as AnalyticsQuery["category"])}>
          <option value="bakso">Bakso</option><option value="coffee">Kopi / Kafe</option><option value="nasi-goreng">Nasi Goreng</option>
          <option value="restaurant">Restoran</option><option value="warung">Warung / Tenda</option><option value="street-food">Kaki Lima</option>
          <option value="fast-food">Fast Food</option><option value="minimarket">Minimarket</option><option value="pharmacy">Apotek</option>
        </select></label>
        <label><span>Window</span><select value={query.days} onChange={(event) => onDaysChange(Number(event.target.value) as 7 | 30)}>
          <option value={7}>7 hari</option><option value={30}>30 hari</option>
        </select></label>
      </div>

      {loading ? <p className="analytics-state" role="status"><LoaderCircle className="analytics-spin" size={16} /> Menghitung agregat...</p> : null}
      {error ? <p className="analytics-state analytics-state--error" role="alert">{error}</p> : null}
      {!loading && data ? <>
        <p className="analytics-caveat"><Info size={14} /> Sinyal observasi GETRA, bukan total demand penduduk atau proyeksi pendapatan.</p>
        <AnalyticsLegend mode={query.mode} />
        <div className="analytics-region-tabs" aria-label="Wilayah analytics">
          {data.rows.map((row) => <button key={row.spatial_unit.id} type="button" aria-pressed={selected?.spatial_unit.id === row.spatial_unit.id} onClick={() => onSelectRegion(row.spatial_unit.id)}>{shortRegion(row.spatial_unit.name)}</button>)}
        </div>
        {selected ? <AnalyticsSummary row={selected} /> : null}
        <div className="analytics-chart-tabs" tabIndex={0} aria-label="Grafik analytics, gulir horizontal untuk melihat grafik berikutnya">
          <section><h4>Demand vs represented supply</h4><AnalyticsChart option={demandSupplyOption} label="Perbandingan Demand Score dan Supply Score per wilayah" /></section>
          <section><h4>Retail Gap relatif</h4><AnalyticsChart option={gapOption} label="Retail Gap per wilayah dari minus seratus sampai seratus" /></section>
          <section><h4>Komposisi raw signal</h4><AnalyticsChart option={sourceOption} label={`Komposisi sinyal mentah ${selected?.spatial_unit.name ?? "wilayah"}`} /></section>
        </div>
        <div className="analytics-table-wrap" tabIndex={0} aria-label="Tabel ringkasan analytics">
          <table className="analytics-table"><thead><tr><th>Wilayah</th><th>D</th><th>S</th><th>Gap</th><th>Bukti</th></tr></thead><tbody>
            {data.rows.map((row) => <tr key={row.spatial_unit.id}><th>{shortRegion(row.spatial_unit.name)}</th><td>{row.demand_score}</td><td>{row.supply_score}</td><td>{row.retail_gap ?? "-"}</td><td>{CONFIDENCE_LABELS[row.evidence.confidence]}</td></tr>)}
          </tbody></table>
        </div>
        <button className="analytics-explain-button" type="button" onClick={explain} disabled={!selected || interpretationLoading}>
          <BrainCircuit size={15} /> {interpretationLoading ? "Memeriksa fakta..." : "Jelaskan data terpilih"}
        </button>
        {visibleInterpretation ? <div className="analytics-interpretation" role="status"><strong>{visibleInterpretation.status === "AI" ? "Interpretasi AI ter-grounding" : "Penjelasan deterministik"}</strong><p>{visibleInterpretation.answer}</p></div> : null}
        {visibleInterpretationError ? <p className="analytics-state analytics-state--error" role="alert">{visibleInterpretationError} Angka, peta, dan chart tetap tersedia.</p> : null}
        <footer className="analytics-model">{data.demand_model_version} / {data.retail_gap_model_version}</footer>
      </> : null}
    </section>
  );
}

function AnalyticsSummary({ row }: { row: AnalyticsRow }) {
  return <div
    className="analytics-summary"
    aria-live="polite"
    data-region-id={row.spatial_unit.id}
    data-confidence={row.evidence.confidence}
    data-sample-size={row.evidence.sample_size}
    data-retail-gap={row.retail_gap ?? "INSUFFICIENT_DATA"}
  >
    <div><span>Demand</span><strong>{row.demand_score}</strong></div>
    <div><span>Supply</span><strong>{row.supply_score}</strong></div>
    <div><span>Retail Gap</span><strong>{row.retail_gap ?? "-"}</strong></div>
    <div><span>Sample</span><strong>{row.evidence.sample_size}</strong></div>
    <p>{row.evidence.confidence === "INSUFFICIENT_DATA" ? "Data belum cukup untuk menghitung Retail Gap secara andal." : CONFIDENCE_LABELS[row.evidence.confidence]}</p>
    <p>Raw: {row.raw_counts.search_events} search, {row.raw_counts.route_requests} route, {row.raw_counts.commuter_requests} commuter request, {row.raw_counts.transaction_observations} transaction observation, {row.raw_counts.canonical_merchants} merchant canonical.</p>
  </div>;
}

function AnalyticsLegend({ mode }: { mode: AnalyticsMode }) {
  const items = mode === "DEMAND"
    ? [
      { className: "analytics-legend__swatch--demand-low", label: "0-34 rendah" },
      { className: "analytics-legend__swatch--demand-medium", label: "35-69 sedang" },
      { className: "analytics-legend__swatch--demand-high", label: "70-100 tinggi" },
    ]
    : [
      { className: "analytics-legend__swatch--gap-negative", label: "-100 sampai -1: supply relatif lebih tinggi" },
      { className: "analytics-legend__swatch--gap-neutral", label: "0: seimbang" },
      { className: "analytics-legend__swatch--gap-positive", label: "1 sampai 100: demand relatif lebih tinggi" },
    ];

  return <div className="analytics-legend" aria-label={`Legenda peta ${mode === "DEMAND" ? "Demand Score" : "Retail Gap"}`}>
    {items.map((item) => <span key={item.label}><i className={item.className} aria-hidden="true" />{item.label}</span>)}
    <span><i className="analytics-legend__swatch--insufficient" aria-hidden="true" />Data belum cukup</span>
  </div>;
}

function shortRegion(name: string) { return name.replace(/^Jakarta\s+/, ""); }
