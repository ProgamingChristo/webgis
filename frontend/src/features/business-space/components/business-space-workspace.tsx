"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import { BarChart3, BrainCircuit, Building2, LoaderCircle, MapPinned, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { businessSpaceService } from "../services/business-space.service";
import type {
  BusinessCategorySlug,
  BusinessSpaceCandidate,
  BusinessSpaceCandidateDetail,
  BusinessSpaceComparison,
  BusinessSpaceInsight,
} from "../types/business-space.types";
import { BusinessSpaceChart } from "./business-space-chart";
import { BusinessSpaceMap } from "./business-space-map";

const REGIONS = [
  { id: "jakarta-selatan", label: "Jakarta Selatan" },
  { id: "jakarta-pusat", label: "Jakarta Pusat" },
  { id: "jakarta-barat", label: "Jakarta Barat" },
  { id: "jakarta-timur", label: "Jakarta Timur" },
  { id: "jakarta-utara", label: "Jakarta Utara" },
] as const;

const CATEGORIES: Array<{ slug: BusinessCategorySlug; label: string }> = [
  { slug: "bakso", label: "Bakso" },
  { slug: "coffee", label: "Kopi / Kafe" },
  { slug: "nasi-goreng", label: "Nasi Goreng" },
  { slug: "restaurant", label: "Restoran" },
  { slug: "warung", label: "Warung" },
  { slug: "minimarket", label: "Minimarket" },
];

export function BusinessSpaceWorkspace() {
  const [regionId, setRegionId] = useState<(typeof REGIONS)[number]["id"]>("jakarta-selatan");
  const [category, setCategory] = useState<BusinessCategorySlug>("bakso");
  const [days, setDays] = useState<7 | 30>(30);
  const [candidates, setCandidates] = useState<BusinessSpaceCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BusinessSpaceCandidateDetail | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<BusinessSpaceComparison | null>(null);
  const [insight, setInsight] = useState<BusinessSpaceInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listAbort = useRef<AbortController | null>(null);

  const loadCandidates = useCallback(() => {
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    setLoading(true);
    setError(null);
    businessSpaceService.listCandidates({ region_id: regionId, category, days, limit: 12 }, controller.signal)
      .then((result) => {
        setCandidates(result.candidates);
        setSelectedId((current) => current && result.candidates.some((item) => item.id === current) ? current : result.candidates[0]?.id ?? null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Kandidat properti tidak tersedia.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [regionId, category, days]);

  useEffect(() => {
    const timeout = window.setTimeout(loadCandidates, 0);
    return () => {
      window.clearTimeout(timeout);
      listAbort.current?.abort();
    };
  }, [loadCandidates]);

  useEffect(() => {
    let controller: AbortController | null = null;
    const timeout = window.setTimeout(() => {
      if (!selectedId) {
        setSelected(null);
        return;
      }
      controller = new AbortController();
      setDetailLoading(true);
      businessSpaceService.detail(selectedId, { category, days }, controller.signal)
        .then(setSelected)
        .catch(() => setSelected(null))
        .finally(() => {
          if (!controller?.signal.aborted) setDetailLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      controller?.abort();
    };
  }, [selectedId, category, days]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setComparisonIds([]);
      setComparison(null);
      setInsight(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [category, days, regionId]);

  async function runCompare(ids = comparisonIds) {
    if (ids.length < 2) return;
    setCompareLoading(true);
    setInsight(null);
    try {
      setComparison(await businessSpaceService.compare(ids, category, days));
    } finally {
      setCompareLoading(false);
    }
  }

  async function askInsight() {
    if (comparisonIds.length < 2) return;
    setInsight(await businessSpaceService.insight(comparisonIds, category, days));
  }

  function toggleComparison(candidateId: string) {
    setComparisonIds((current) => {
      if (current.includes(candidateId)) return current.filter((id) => id !== candidateId);
      if (current.length >= 4) return current;
      return [...current, candidateId];
    });
  }

  const comparisonOption = useMemo<EChartsOption>(() => ({
    animationDuration: 300,
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: "#bdd5dd", fontSize: 10 } },
    grid: { left: 36, right: 18, top: 28, bottom: 50 },
    xAxis: { type: "category", data: comparison?.candidates.map((item, index) => `P${index + 1}`) ?? [], axisLabel: { color: "#9fb6bf" } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#9fb6bf" }, splitLine: { lineStyle: { color: "rgba(148,180,190,.14)" } } },
    series: [
      { name: "Demand", type: "bar", data: comparison?.candidates.map((item) => item.market_context.demand_score) ?? [], itemStyle: { color: "#22d3ee" } },
      { name: "Supply", type: "bar", data: comparison?.candidates.map((item) => item.market_context.supply_score) ?? [], itemStyle: { color: "#a3e635" } },
    ],
  }), [comparison]);

  return (
    <main className="business-space" data-category={category} data-days={days}>
      <header className="business-space__top">
        <div>
          <span className="eyebrow">Properti Go decision support</span>
          <h1>Business Space Intelligence</h1>
          <p>Konteks lokasi kandidat properti, bukan marketplace, ketersediaan live, ROI, revenue, atau jaminan profit.</p>
        </div>
        <button type="button" onClick={loadCandidates}><RefreshCcw size={16} />Refresh</button>
      </header>

      <section className="business-space__controls" aria-label="Filter Business Space">
        <label><span>Kategori bisnis</span><select value={category} onChange={(event) => setCategory(event.target.value as BusinessCategorySlug)}>{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
        <label><span>Wilayah</span><select value={regionId} onChange={(event) => setRegionId(event.target.value as typeof regionId)}>{REGIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Window</span><select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30)}><option value={7}>7 hari</option><option value={30}>30 hari</option></select></label>
      </section>

      {error ? <p className="business-space__error" role="alert">{error}</p> : null}
      <section className="business-space__layout">
        <aside className="business-space__candidates" aria-label="Daftar kandidat Properti Go">
          <h2>Kandidat Properti Go</h2>
          {loading ? <p role="status"><LoaderCircle className="analytics-spin" size={15} /> Memuat kandidat...</p> : null}
          {candidates.map((candidate, index) => (
            <button key={candidate.id} type="button" data-candidate-id={candidate.id} className={selectedId === candidate.id ? "bs-candidate bs-candidate--active" : "bs-candidate"} onClick={() => setSelectedId(candidate.id)}>
              <span>P{index + 1}</span>
              <strong>{candidate.property_category ?? "Observasi properti"}</strong>
              <small>{candidate.address ?? "Alamat tidak tersedia"}</small>
              <em>{freshnessLabel(candidate.freshness)} / Availability unconfirmed</em>
            </button>
          ))}
        </aside>

        <BusinessSpaceMap candidates={candidates} selectedId={selectedId} comparison={comparison?.candidates ?? []} onSelect={setSelectedId} />

        <aside className="business-space__detail" aria-label="Detail kandidat">
          {detailLoading ? <p role="status"><LoaderCircle className="analytics-spin" size={15} /> Menghitung konteks...</p> : null}
          {selected ? <CandidateDetail detail={selected} selected={comparisonIds.includes(selected.candidate.id)} onToggle={() => toggleComparison(selected.candidate.id)} /> : <p>Pilih kandidat properti.</p>}
        </aside>
      </section>

      <section className="business-space__comparison">
        <header>
          <div><span className="eyebrow">Comparison</span><h2>Trade-off Matrix</h2></div>
          <button type="button" disabled={comparisonIds.length < 2 || compareLoading} onClick={() => runCompare()}>
            {compareLoading ? <LoaderCircle className="analytics-spin" size={15} /> : <BarChart3 size={15} />}
            Compare {comparisonIds.length}
          </button>
        </header>
        {comparison ? <>
          <BusinessSpaceChart option={comparisonOption} label="Demand dan Supply Score antar kandidat Business Space" />
          <div className="business-space__table-wrap" tabIndex={0}>
            <table>
              <thead><tr><th>Metric</th>{comparison.candidates.map((item, index) => <th key={item.candidate.id}>P{index + 1}</th>)}</tr></thead>
              <tbody>{comparison.metric_rows.map((row) => <tr key={row.metric}><th>{row.metric}</th>{row.values.map((value) => <td key={value.candidate_id}>{value.value}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="business-space__claim">{comparison.trade_off_summary}</p>
          <button type="button" onClick={askInsight}><BrainCircuit size={15} />AI Location Insight</button>
          {insight ? <p className="business-space__insight" role="status"><strong>{insight.status === "AI" ? "AI grounded" : "Deterministic"}</strong>{insight.answer}</p> : null}
        </> : <p>Pilih 2 sampai 4 kandidat untuk comparison.</p>}
      </section>
    </main>
  );
}

function CandidateDetail({ detail, selected, onToggle }: { detail: BusinessSpaceCandidateDetail; selected: boolean; onToggle: () => void }) {
  const candidate = detail.candidate;
  return (
    <div className="bs-detail-card" data-candidate-id={candidate.id}>
      <header>
        <Building2 size={18} />
        <div><h2>{candidate.property_category ?? "Observasi properti"}</h2><p>{candidate.property_transaction_type ?? "Jenis properti belum tersedia"}</p></div>
      </header>
      <p><MapPinned size={14} />{candidate.address ?? "Alamat tidak tersedia"}</p>
      <dl>
        <div><dt>Freshness</dt><dd>{freshnessLabel(candidate.freshness)}</dd></div>
        <div><dt>Availability</dt><dd>{availabilityLabel(candidate.availability)}</dd></div>
        <div><dt>Admin area</dt><dd>{detail.administrative_context.region_name ?? "Unknown"}</dd></div>
        <div><dt>Transit</dt><dd>{detail.transit_context.nearest ? `${detail.transit_context.nearest.network_walking_minutes} min network walk` : "Unavailable"}</dd></div>
        <div><dt>Walking catchment</dt><dd>{detail.walking_context.status === "ROUTABLE" ? `${detail.walking_context.catchment_minutes} min network` : "Walking network access unavailable"}</dd></div>
        <div><dt>Demand</dt><dd>{detail.market_context.demand_score ?? "Insufficient Data"}</dd></div>
        <div><dt>Supply</dt><dd>{detail.market_context.supply_score ?? "Insufficient Data"}</dd></div>
        <div><dt>Retail Gap</dt><dd>{detail.market_context.retail_gap ?? "Insufficient Data"}</dd></div>
      </dl>
      <ul>{detail.indicators.map((item) => <li key={item.id} data-status={item.status}><span>{item.label}</span><strong>{item.value}</strong></li>)}</ul>
      <button type="button" onClick={onToggle}>{selected ? <Trash2 size={15} /> : <Plus size={15} />}{selected ? "Remove comparison" : "Add comparison"}</button>
      <footer>{detail.model_version} / {detail.market_context.demand_model_version ?? "Demand unavailable"} / {detail.market_context.retail_gap_model_version ?? "Retail Gap unavailable"}</footer>
    </div>
  );
}

function freshnessLabel(value: string) {
  if (value === "FRESH") return "Fresh";
  if (value === "AGING") return "Aging";
  if (value === "STALE") return "Needs reconfirmation";
  return "Unknown freshness";
}

function availabilityLabel(value: string) {
  if (value === "NEEDS_RECONFIRMATION") return "Needs reconfirmation";
  if (value === "UNKNOWN_FRESHNESS") return "Unknown freshness";
  return "Availability unconfirmed";
}
