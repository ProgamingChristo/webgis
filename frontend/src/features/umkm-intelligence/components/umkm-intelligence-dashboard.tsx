"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import {
  AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, Clock3,
  LoaderCircle, MapPinned, SearchCheck, Store,
} from "lucide-react";
import { useUmkmIntelligence } from "../hooks/use-umkm-intelligence";
import { umkmIntelligenceService } from "../services/umkm-intelligence.service";
import type { ReadinessDiagnostic, UmkmCopilotResult } from "../types/umkm-intelligence.types";
import { UmkmIntelligenceChart } from "./umkm-intelligence-chart";
import { UmkmIntelligenceMap } from "./umkm-intelligence-map";

export function UmkmIntelligenceDashboard({ merchants }: { merchants: Array<{ id: string; name: string; category: string }> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [days, setDays] = useState<7 | 30>(30);
  const effectiveId = merchants.some((merchant) => merchant.id === selectedId) ? selectedId : merchants[0]?.id ?? null;
  const intelligence = useUmkmIntelligence(effectiveId, days);
  const [question, setQuestion] = useState("Kenapa visibilitas merchant saya belum maksimal?");
  const [copilot, setCopilot] = useState<UmkmCopilotResult | null>(null);
  const [copilotKey, setCopilotKey] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const currentKey = `${effectiveId}:${days}`;
  const visibleCopilot = copilotKey === currentKey ? copilot : null;
  const visibleCopilotError = copilotKey === currentKey ? copilotError : null;

  const scoreOption = useMemo<EChartsOption>(() => ({
    animationDuration: 300, backgroundColor: "transparent",
    grid: { left: 35, right: 12, top: 12, bottom: 38 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: ["Data", "Visibility", "Location"], axisLabel: { color: "#a8c4cc", fontSize: 10 } },
    yAxis: { type: "value", min: 0, max: 100, name: "Skor readiness", axisLabel: { color: "#91aeb7", fontSize: 9 }, nameTextStyle: { color: "#91aeb7", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(148, 180, 190, .12)" } } },
    series: [{ type: "bar", data: [intelligence.data?.data_readiness.score ?? 0, intelligence.data?.visibility.score ?? 0, intelligence.data?.location_readiness.score ?? 0], itemStyle: { color: "#22d3ee" }, label: { show: true, position: "top", color: "#e6f7fa" } }],
  }), [intelligence.data]);
  const marketOption = useMemo<EChartsOption>(() => ({
    animationDuration: 300, backgroundColor: "transparent",
    grid: { left: 34, right: 12, top: 12, bottom: 38 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: ["Demand", "Supply", "Retail Gap"], axisLabel: { color: "#a8c4cc", fontSize: 10 } },
    yAxis: { type: "value", min: -100, max: 100, name: "Indeks relatif", axisLabel: { color: "#91aeb7", fontSize: 9 }, nameTextStyle: { color: "#91aeb7", fontSize: 9 }, splitLine: { lineStyle: { color: "rgba(148, 180, 190, .12)" } } },
    series: [{ type: "bar", data: [
      { value: intelligence.data?.market_context.demand_score, itemStyle: { color: "#22d3ee" } },
      { value: intelligence.data?.market_context.supply_score, itemStyle: { color: "#facc15" } },
      { value: intelligence.data?.market_context.retail_gap, itemStyle: { color: (intelligence.data?.market_context.retail_gap ?? 0) >= 0 ? "#84cc16" : "#fb7185" } },
    ], label: { show: true, position: "top", color: "#e6f7fa" } }],
  }), [intelligence.data]);
  const sourceOption = useMemo<EChartsOption>(() => {
    const counts = intelligence.data?.market_context.raw_counts;
    return {
      animationDuration: 300, backgroundColor: "transparent",
      tooltip: { trigger: "item" }, legend: { bottom: 0, textStyle: { color: "#a8c4cc", fontSize: 9 } },
      series: [{ type: "pie", radius: ["34%", "62%"], center: ["50%", "43%"], label: { color: "#d8e9ed", fontSize: 9 }, data: counts ? [
        { name: "Search", value: counts.search_events }, { name: "Route", value: counts.route_requests },
        { name: "Commuter", value: counts.commuter_requests }, { name: "Struk obs.", value: counts.transaction_observations },
      ].filter((item) => item.value > 0) : [] }],
    };
  }, [intelligence.data]);

  async function askCopilot(event: React.FormEvent) {
    event.preventDefault();
    if (!effectiveId || !question.trim()) return;
    setCopilotLoading(true); setCopilotError(null); setCopilotKey(currentKey);
    try { setCopilot(await umkmIntelligenceService.ask(effectiveId, days, question.trim())); }
    catch (cause) { setCopilotError(cause instanceof Error ? cause.message : "Copilot tidak tersedia."); }
    finally { setCopilotLoading(false); }
  }

  if (merchants.length === 0) return <section className="umkm-intelligence-empty" data-ownership-state="EMPTY">
    <Store size={24} aria-hidden="true" />
    <div><h2>Intelligence menunggu merchant terverifikasi</h2><p>Mode UMKM tidak memberikan ownership. Ajukan merchant, lalu tunggu persetujuan sebelum insight privat tersedia.</p></div>
    <Link href="/umkm/merchants/new">Ajukan merchant</Link>
  </section>;

  return <section className="umkm-intelligence" aria-labelledby="umkm-intelligence-title" data-merchant-id={effectiveId ?? ""} data-window-days={days}>
    <header className="umkm-intelligence__header">
      <div><span className="eyebrow">Owner-authorized workspace</span><h2 id="umkm-intelligence-title">UMKM Intelligence</h2><p>Diagnosis bukti merchant, kesiapan discovery, lokasi, dan konteks pasar GETRA.</p></div>
      <BarChart3 size={20} aria-hidden="true" />
    </header>
    <div className="umkm-intelligence__controls">
      <label><span>Merchant</span><select value={effectiveId ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{merchants.map((merchant) => <option value={merchant.id} key={merchant.id}>{merchant.name}</option>)}</select></label>
      <div><span>Window</span><div className="umkm-intelligence__segments"><button type="button" aria-pressed={days === 7} onClick={() => setDays(7)}>7 hari</button><button type="button" aria-pressed={days === 30} onClick={() => setDays(30)}>30 hari</button></div></div>
    </div>
    {intelligence.loading ? <p className="umkm-intelligence-state" role="status"><LoaderCircle className="analytics-spin" size={16} /> Menghitung intelligence...</p> : null}
    {intelligence.error ? <p className="umkm-intelligence-state umkm-intelligence-state--error" role="alert"><AlertTriangle size={15} />{intelligence.error}</p> : null}
    {intelligence.data ? <>
      <div className="umkm-intelligence__identity"><div><strong>{intelligence.data.merchant.name}</strong><span>{intelligence.data.merchant.category} | {intelligence.data.market_context.area?.name ?? "Wilayah belum tersedia"}</span></div><span>{intelligence.data.merchant.source_freshness === "FRESH" ? "Sumber terkini" : "Perlu konfirmasi sumber"}</span></div>
      <div className="umkm-intelligence__metrics">
        <Metric icon={CheckCircle2} label="Data Readiness" value={intelligence.data.data_readiness.score} detail={intelligence.data.data_readiness.status} />
        <Metric icon={SearchCheck} label="Visibility" value={intelligence.data.visibility.score} detail="Kesiapan discovery" />
        <Metric icon={MapPinned} label="Location" value={intelligence.data.location_readiness.score} detail={intelligence.data.location_context.network_status} />
        <Metric icon={BarChart3} label="Demand Score" value={intelligence.data.market_context.demand_score} detail={intelligence.data.market_context.confidence} />
        <Metric icon={Clock3} label="Retail Gap" value={intelligence.data.market_context.retail_gap} detail="Indeks relatif" />
      </div>
      <p className="umkm-intelligence__claim">Demand signal GETRA dan represented supply, bukan jumlah calon pelanggan, revenue, profit, atau ROI.</p>
      <div className="umkm-intelligence__diagnostics">
        <Diagnostic title="Data Readiness" diagnostic={intelligence.data.data_readiness} />
        <Diagnostic title="Visibility Readiness" diagnostic={intelligence.data.visibility} />
        <Diagnostic title="Location Readiness" diagnostic={intelligence.data.location_readiness} />
      </div>
      <div className="umkm-intelligence__spatial">
        <div><h3>Konteks lokasi</h3><UmkmIntelligenceMap data={intelligence.data} /></div>
        <div className="umkm-intelligence__location-copy">
          <h3>Bukti jaringan</h3>
          <p>Area: <strong>{intelligence.data.market_context.area?.name ?? "Belum tersedia"}</strong></p>
          <p>Jaringan pedestrian: <strong>{intelligence.data.location_context.network_status}</strong></p>
          {intelligence.data.location_context.nearest_transit ? <p>Transit jaringan terdekat: <strong>{intelligence.data.location_context.nearest_transit.name}</strong>, {Math.ceil(intelligence.data.location_context.nearest_transit.network_walking_seconds / 60)} menit melalui pgRouting.</p> : <p>Bukti perjalanan jaringan ke transit belum tersedia.</p>}
          <p>{intelligence.data.nearby_similar_merchants.length} merchant sejenis ditampilkan dalam area administratif yang sama, maksimum 20.</p>
        </div>
      </div>
      <div className="umkm-intelligence__charts" tabIndex={0} aria-label="Grafik UMKM Intelligence, gulir horizontal untuk grafik berikutnya">
        <section><h3>Readiness breakdown</h3><UmkmIntelligenceChart option={scoreOption} label="Data, Visibility, dan Location Readiness dari nol sampai seratus" /></section>
        <section><h3>Demand, Supply, Retail Gap</h3><UmkmIntelligenceChart option={marketOption} label="Indeks Demand, Supply, dan Retail Gap untuk kategori merchant" /></section>
        <section><h3>Komposisi sinyal demand</h3><UmkmIntelligenceChart option={sourceOption} label="Komposisi raw signal Search, Route, Commuter, dan Struk observation" /></section>
      </div>
      <section className="umkm-intelligence__recommendations"><h3>Rekomendasi tindakan</h3>{intelligence.data.recommendations.length ? <ol>{intelligence.data.recommendations.map((item) => <li key={item.id} data-priority={item.priority}><span>{item.priority}</span><div><strong>{item.title}</strong><p>{item.reason}</p><small>{item.action}</small></div></li>)}</ol> : <p>Tidak ada rekomendasi aktif dari aturan deterministik saat ini.</p>}</section>
      <section className="umkm-intelligence__copilot"><div><BrainCircuit size={18} /><h3>UMKM Copilot</h3></div><form onSubmit={askCopilot}><label htmlFor="umkm-copilot-question">Pertanyaan berbasis evidence merchant</label><textarea id="umkm-copilot-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} /><button type="submit" disabled={copilotLoading}>{copilotLoading ? <LoaderCircle className="analytics-spin" size={15} /> : <BrainCircuit size={15} />}{copilotLoading ? "Memeriksa fakta..." : "Jelaskan"}</button></form>{visibleCopilot ? <div className="umkm-intelligence__answer" role="status"><strong>{visibleCopilot.status === "AI" ? "Penjelasan AI ter-grounding" : "Penjelasan deterministik"}</strong><p>{visibleCopilot.answer}</p></div> : null}{visibleCopilotError ? <p role="alert">{visibleCopilotError} Dashboard tetap dapat digunakan.</p> : null}</section>
      <footer>{Object.values(intelligence.data.model_versions).join(" / ")}</footer>
    </> : null}
  </section>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof CheckCircle2; label: string; value: number | null; detail: string }) {
  return <article><Icon size={15} aria-hidden="true" /><span>{label}</span><strong>{value ?? "-"}</strong><small>{detail.replaceAll("_", " ")}</small></article>;
}

function Diagnostic({ title, diagnostic }: { title: string; diagnostic: ReadinessDiagnostic }) {
  return <section><header><h3>{title}</h3><strong>{diagnostic.score} / 100</strong></header><ul>{diagnostic.components.map((item) => <li key={item.id} data-status={item.status}><span>{item.status === "MISSING" ? "X" : item.status === "LIMITED" ? "!" : "OK"}</span><div><strong>{item.label}</strong><small>{item.evidence}</small></div><b>{item.points}/{item.max_points}</b></li>)}</ul></section>;
}
