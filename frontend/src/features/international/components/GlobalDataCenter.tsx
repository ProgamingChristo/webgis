"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import type { Feature, Geometry } from "geojson";
import { BASEMAP_OPTIONS, getBasemapOption, getDefaultBasemapId } from "@/lib/mapid";
import { useBasemap } from "@/lib/basemap-state";
import { applyBasemap } from "@/lib/basemap-engine";
import { INTERNATIONAL_LAYERS, type InternationalLayer, type InternationalResult, type InternationalRecord } from "@/types/international";
import styles from "./global-data-center.module.css";
import { datasetLegend } from "../legend";

const CATEGORIES = ["restaurant", "cafe", "hospital", "pharmacy", "school", "library", "park", "toilet", "drinking_water", "charging_station", "fuel", "police", "fire_station", "bus_stop", "railway_station"];
const EMPTY = { type: "FeatureCollection" as const, features: [] };
const formatTime = (time: string | null | undefined) => time ? new Date(time).toLocaleString("id-ID", { timeZoneName: "short" }) : "Tidak dipublikasikan";

function syncData(map: MapLibreMap, result: InternationalResult | null, opacity: number) {
  if (!map.isStyleLoaded()) return;
  const source = map.getSource("getra-international") as GeoJSONSource | undefined;
  if (source) source.setData(result?.data ?? EMPTY);
  else map.addSource("getra-international", { type: "geojson", data: result?.data ?? EMPTY, cluster: true, clusterRadius: 42, clusterMaxZoom: 13 });
  if (!map.getLayer("getra-international-points")) map.addLayer({ id: "getra-international-points", type: "circle", source: "getra-international", paint: { "circle-color": ["case", ["has", "point_count"], "#0e7490", ["==", ["get", "freshness"], "STALE"], "#b45309", "#0369a1"], "circle-radius": ["case", ["has", "point_count"], 17, 7], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
  if (!map.getLayer("getra-international-clusters")) map.addLayer({ id: "getra-international-clusters", type: "symbol", source: "getra-international", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#ffffff" } });
  map.setPaintProperty("getra-international-points", "circle-color", datasetLegend(result?.layer ?? "weather").color);
  if (map.getLayer("getra-international-image")) map.removeLayer("getra-international-image");
  if (map.getSource("getra-international-image")) map.removeSource("getra-international-image");
  if (result?.imagery) {
    map.addSource("getra-international-image", { type: "image", url: result.imagery.url, coordinates: result.imagery.coordinates });
    map.addLayer({ id: "getra-international-image", type: "raster", source: "getra-international-image", paint: { "raster-opacity": opacity } }, "getra-international-points");
  }
}

export function GlobalDataCenter({ initialLayer = "weather", basemapOnly = false }: { initialLayer?: InternationalLayer; basemapOnly?: boolean }) {
  const [layer, setLayer] = useState<InternationalLayer>(initialLayer);
  const [basemapId, switchBasemap] = useBasemap();
  const [basemapState, setBasemapState] = useState("LOADING");
  const [basemapError, setBasemapError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});
  const [mapReady, setMapReady] = useState(false);
  const [retryMap, setRetryMap] = useState(0);
  const [result, setResult] = useState<InternationalResult | null>(null);
  const [state, setState] = useState("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Feature<Geometry, InternationalRecord> | null>(null);
  const [lat, setLat] = useState("-6.2"), [lon, setLon] = useState("106.82");
  const [radius, setRadius] = useState("10000"), [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialLayer === "accessibility" ? "toilet" : initialLayer === "disaster" ? "" : "restaurant"), [magnitude, setMagnitude] = useState("2");
  const [adm4, setAdm4] = useState(""), [system, setSystem] = useState(""), [source, setSource] = useState<InternationalLayer>("earthquakes");
  const datasetLayer = layer === "open-data" ? source : layer;
  const [year, setYear] = useState("");
  const [since, setSince] = useState(""), [until, setUntil] = useState("");
  const [profile, setProfile] = useState("");
  const [opacity, setOpacity] = useState(0.65);
  const [now, setNow] = useState(() => Date.now());
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null), mapRef = useRef<MapLibreMap | null>(null);
  const resultRef = useRef(result), opacityRef = useRef(opacity), layerRef = useRef(layer);
  const requestRef = useRef<AbortController | null>(null);
  const loadedQueryRef = useRef<Record<string, unknown> | null>(null);
  const popupRef = useRef<Popup | null>(null);
  useEffect(() => { resultRef.current = result; opacityRef.current = opacity; layerRef.current = layer; }, [result, opacity, layer]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  useEffect(() => { const controller = new AbortController(); void fetch("/api/basemap/status", { signal: controller.signal }).then(r => r.json()).then(setProviderStatus).catch(() => {}); return () => controller.abort(); }, []);

  const chooseLayer = (id: InternationalLayer) => {
    requestRef.current?.abort(); setLayer(id); setResult(null); setSelected(null); setState("IDLE"); setInterpretation(null); setSystem("");
    if (id === "disaster") setCategory("");
    if (id === "accessibility") setCategory("toilet");
    window.history.replaceState(null, "", `/international/${id}`);
  };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new MapLibreMap({ container: container.current, style: { version: 8, sources: {}, layers: [] }, center: [106.82, -6.2], zoom: 11, attributionControl: { compact: false } });
    mapRef.current = map;
    (window as unknown as { __getraGlobalMap?: MapLibreMap }).__getraGlobalMap = map;
    map.addControl(new NavigationControl(), "top-right");
    const resize = new ResizeObserver(() => map.resize()); resize.observe(container.current);
    map.on("load", () => setMapReady(true));
    map.on("click", async event => {
      const hits = map.getLayer("getra-international-points") ? map.queryRenderedFeatures(event.point, { layers: ["getra-international-points"] }) : [];
      const hit = hits[0];
      if (hit?.properties?.cluster) {
        const src = map.getSource("getra-international") as GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(Number(hit.properties.cluster_id));
        if (hit.geometry.type === "Point") map.easeTo({ center: hit.geometry.coordinates as [number, number], zoom });
        return;
      }
      if (hit) {
        const feature = resultRef.current?.data.features.find(f => String(f.id) === String(hit.id));
        if (feature) { setSelected(feature); popupRef.current?.remove(); popupRef.current = new Popup().setLngLat(event.lngLat).setText(feature.properties.name).addTo(map); }
      } else {
        setLat(event.lngLat.lat.toFixed(5)); setLon(event.lngLat.lng.toFixed(5));
      }
    });
    return () => { requestRef.current?.abort(); resize.disconnect(); popupRef.current?.remove(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    if (providerStatus[basemapId] === "AUTH_REQUIRED") {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        setBasemapError(`${getBasemapOption(basemapId).label}: Basemap gagal dimuat. Kredensial provider diperlukan.`);
        setBasemapState("FALLBACK"); switchBasemap(getDefaultBasemapId());
      });
      return () => { cancelled = true; };
    }
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) setBasemapState("LOADING"); });
    void applyBasemap(map, basemapId, controller.signal, () => syncData(map, resultRef.current, opacityRef.current)).then(() => {
      if (!controller.signal.aborted) setBasemapState("READY");
    }).catch(() => {
      if (controller.signal.aborted) return;
      setBasemapError(`${getBasemapOption(basemapId).label}: Basemap gagal dimuat. ${providerStatus[basemapId] === "AUTH_REQUIRED" ? "Kredensial provider diperlukan." : ""}`);
      if (basemapId !== getDefaultBasemapId()) { setBasemapState("FALLBACK"); switchBasemap(getDefaultBasemapId()); }
      else setBasemapState("ERROR");
    });
    return () => controller.abort();
  }, [basemapId, retryMap, mapReady, switchBasemap, providerStatus]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const update = () => syncData(map, result, opacity);
    // Camera movement can make isStyleLoaded false while data arrives. Retry once
    // after tiles settle instead of leaving a populated detail panel on an empty map.
    if (map.isStyleLoaded()) update(); else map.once("idle", update);
    return () => { map.off("idle", update); };
  }, [result, opacity, basemapState]);

  const load = useCallback(async () => {
    requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller;
    setState("LOADING"); setError(null); setSelected(null); setInterpretation(null);
    const params = new URLSearchParams({ lat, lon, radius });
    if (query.trim()) params.set("q", query.trim());
    if (["poi", "accessibility", "disaster"].includes(datasetLayer) && category) params.set("category", category);
    if (datasetLayer === "earthquakes") params.set("magnitude", magnitude);
    if (datasetLayer === "weather" && adm4) params.set("adm4", adm4);
    if (system) params.set("system", system);
    if (layer === "open-data") params.set("source", source);
    if (datasetLayer === "disaster" && year) params.set("year", year);
    if (since) params.set("since", new Date(since).toISOString());
    if (until) params.set("until", new Date(until).toISOString());
    if (datasetLayer === "elevation" && profile) params.set("points", profile);
    try {
      const response = await fetch(`/api/international/${layer}?${params}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]) });
      if (!response.ok) throw new Error(response.status === 429 ? "Batas permintaan tercapai. Coba lagi dalam satu menit." : "Permintaan data gagal. Periksa koordinat dan filter.");
      const next: InternationalResult = await response.json();
      if (controller.signal.aborted) return;
      loadedQueryRef.current = { ...Object.fromEntries(params), ...(params.has("points") ? { points: JSON.parse(params.get("points")!) } : {}) };
      setResult(next); setState(next.status); setNow(Date.now());
      const map = mapRef.current;
      if (map) {
        if (next.data.features.length && ["places", "bikeshare", "micromobility"].includes(datasetLayer)) {
          const first = next.data.features[0].geometry;
          if (first.type === "Point") map.easeTo({ center: first.coordinates as [number, number], zoom: 12 });
        } else map.easeTo({ center: [Number(lon), Number(lat)] });
      }
    } catch (err) { if (controller.signal.aborted) return; setState(navigator.onLine ? "ERROR" : "OFFLINE"); setError(err instanceof Error ? err.message : "Data tidak tersedia."); }
  }, [lat, lon, radius, query, category, layer, datasetLayer, magnitude, adm4, system, source, year, profile, since, until]);

  const stale = result && [result.fetched_at, result.last_updated].some(time => time !== null && now > Date.parse(time) + result.ttl * 1000);
  const actualState = stale && state === "LIVE" ? "STALE" : state;
  const active = getBasemapOption(basemapId);
  const coordinate = selected?.geometry.type === "Point" ? selected.geometry.coordinates : null;
  const freshness = (record: InternationalRecord) => record.freshness === "STATIC" ? "STATIC" : !record.timestamp ? "UNKNOWN" : now > Date.parse(record.timestamp) + (result?.ttl ?? 0) * 1000 ? "STALE" : "CURRENT";

  return <section className={styles.center} aria-label="Global Data Center">
    <header className={styles.header}><div><span className={styles.eyebrow}>GETRA · GLOBAL DATA CENTER</span><h1>{basemapOnly ? "Basemap Engine" : "Data dunia, di atas peta"}</h1><p>Pilih layer, tentukan lokasi, lalu muat data dari sumbernya.</p></div><Link href="/app">Kembali ke peta GETRA →</Link></header>
    {!basemapOnly && <nav className={styles.tabs} aria-label="Global data categories">{[...new Set(INTERNATIONAL_LAYERS.map(f => f[2]))].map(group => <button type="button" key={group} aria-pressed={INTERNATIONAL_LAYERS.find(f => f[0] === layer)?.[2] === group} onClick={() => chooseLayer(INTERNATIONAL_LAYERS.find(f => f[2] === group)![0])}>{group}</button>)}</nav>}
    <div className={styles.workspace}>
      <aside className={styles.controls}>
        {!basemapOnly && <form onSubmit={e => { e.preventDefault(); void load(); }}>
          <label>Layer<select value={layer} onChange={e => chooseLayer(e.target.value as InternationalLayer)}>{INTERNATIONAL_LAYERS.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
          <div className={styles.coordinates}><label>Latitude<input aria-label="Latitude" required type="number" step="any" min="-90" max="90" value={lat} onChange={e => setLat(e.target.value)} /></label><label>Longitude<input aria-label="Longitude" required type="number" step="any" min="-180" max="180" value={lon} onChange={e => setLon(e.target.value)} /></label></div>
          <p className={styles.hint}>Klik peta untuk memilih koordinat. Data dimuat hanya saat Anda meminta.</p>
          <button type="button" onClick={() => { const center = mapRef.current?.getCenter(); if (center) { setLat(center.lat.toFixed(5)); setLon(center.lng.toFixed(5)); } }}>Gunakan pusat peta</button>
          <label>Radius<select value={radius} onChange={e => setRadius(e.target.value)}><option value="1000">1 km</option><option value="10000">10 km</option><option value="25000">25 km</option><option value="250000">250 km</option><option value="20000000">Global (gempa)</option></select></label>
          {["places", "bikeshare", "micromobility"].includes(datasetLayer) && <label>Cari tempat / sistem<input value={query} onChange={e => setQuery(e.target.value)} maxLength={120} placeholder="Nama kota atau operator" /></label>}
          {["poi", "accessibility"].includes(datasetLayer) && <label>Fasilitas<select value={category} onChange={e => setCategory(e.target.value)}>{(datasetLayer === "accessibility" ? ["toilet", "entrance", "parking", "hospital", "station"] : CATEGORIES).map(v => <option key={v}>{v}</option>)}</select></label>}
          {datasetLayer === "earthquakes" && <label>Magnitudo minimum<select value={magnitude} onChange={e => setMagnitude(e.target.value)}>{[2,4,5,6].map(n => <option value={n} key={n}>M{n}+</option>)}</select></label>}
          {datasetLayer === "weather" && <label>BMKG kode desa (opsional)<input value={adm4} onChange={e => setAdm4(e.target.value)} placeholder="31.71.03.1001" /><small>Tanpa kode desa: Open-Meteo global.</small></label>}
          {datasetLayer === "elevation" && <label>Profil rute (opsional)<textarea value={profile} onChange={e => setProfile(e.target.value)} placeholder="[[longitude,latitude],…] maksimal 20 titik rute" /><button type="button" onClick={() => { const mainMap = (window as unknown as { __getraMapLibreInstance?: MapLibreMap }).__getraMapLibreInstance; const sources = mainMap?.getStyle()?.sources ?? {}; for (const [id, src] of Object.entries(sources)) if (/route/i.test(id) && src.type === "geojson" && typeof src.data === "object") { const raw = src.data as { geometry?: { coordinates?: number[][] }; features?: { geometry?: { type?: string; coordinates?: number[][] } }[] }; const points = raw.geometry?.coordinates ?? raw.features?.find(f => f.geometry?.type === "LineString")?.geometry?.coordinates; if (points?.length) { setProfile(JSON.stringify(points.filter((_, i) => i % Math.max(1, Math.ceil(points.length / 19)) === 0).slice(0,20))); return; } } setError("Tidak ada geometri rute aktif yang dapat dibaca. Masukkan titik rute GIS."); }}>Ambil rute aktif</button></label>}
          {layer === "open-data" && <label>Dataset<select value={source} onChange={e => { const id = e.target.value as InternationalLayer; requestRef.current?.abort(); setSource(id); setResult(null); setState("IDLE"); setSelected(null); setInterpretation(null); setSystem(""); setCategory(id === "accessibility" ? "toilet" : id === "disaster" ? "" : "restaurant"); }}>{INTERNATIONAL_LAYERS.filter(f => f[0] !== "open-data").map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
          {datasetLayer === "disaster" && <><label>Tahun<input type="number" min="1900" max="2100" value={year} onChange={e => setYear(e.target.value)} /></label><label>Jenis insiden<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Semua</option>{["flood","fire","earthquake","storm"].map(c => <option key={c}>{c}</option>)}</select></label></>}
          {["open-data", "earthquakes", "disaster"].includes(layer) && <><label>Dari waktu<input type="datetime-local" value={since} onChange={e => setSince(e.target.value)} /></label><label>Sampai waktu<input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)} /></label></>}
          {result?.systems && <label>Sistem GBFS<select value={system} onChange={e => setSystem(e.target.value)}><option value="">Pilih sistem publik</option>{result.systems.map(s => <option key={s.id} value={s.id}>{s.name} · {s.location}, {s.country}</option>)}</select></label>}
          <button className={styles.primary} disabled={state === "LOADING"} type="submit">{state === "LOADING" ? "Memuat…" : "Muat data / Retry"}</button>
        </form>}
        <details className={styles.basemaps} open={basemapOnly || undefined}><summary>Basemap · {active.label}</summary>
          <div role="status" data-basemap-status={basemapState}>{basemapState}</div>
          {BASEMAP_OPTIONS.map(option => <button key={option.id} type="button" aria-pressed={option.id === basemapId} data-basemap={option.id} onClick={() => { setBasemapError(null); if (option.id === basemapId) setRetryMap(n => n + 1); switchBasemap(option.id); }}><strong>{option.label}{option.id === basemapId ? " ✓" : ""}</strong><span>{option.description}</span><small>{option.provider} · {option.type}<br />{providerStatus[option.id] ?? "CHECKING"}<br />{option.attribution}</small></button>)}
          <button type="button" onClick={() => { setBasemapError(null); switchBasemap("mapid-default"); setRetryMap(n => n+1); }}>Reset ke MAPID</button>
        </details>
      </aside>
      <div className={styles.mapArea}><button className={styles.mobileBasemap} type="button" onClick={() => { const details = container.current?.closest("section")?.querySelector("details"); if (details) details.open = !details.open; }}>Basemap: {active.label}</button><div className={styles.map} ref={container} aria-label="Peta data internasional" />
        {basemapError && <div className={styles.mapNotice} role="alert">{basemapError} <button onClick={() => { switchBasemap("mapid-default"); setRetryMap(n => n + 1); }}>Gunakan MAPID Default</button></div>}
        {!basemapOnly && <div className={styles.mapBadge}>{INTERNATIONAL_LAYERS.find(f => f[0] === layer)?.[1]} · {actualState === "LIVE" ? "READY" : actualState}</div>}
      </div>
      {!basemapOnly && <aside className={styles.detail} aria-live="polite">
        <h2>{selected ? selected.properties.name : "Data & sumber"}</h2>
        {state === "IDLE" && <p>Pilih lokasi dan tekan Muat data. Tidak ada data contoh.</p>}
        {state === "LOADING" && <p role="status">Menghubungi sumber data…</p>}
        {error && <p role="alert">{error}</p>}
        {result && <>
          <strong className={styles.status}>{actualState === "LIVE" ? "READY — data sumber dimuat" : actualState}</strong>
          {result.quality && <p>Kualitas data: <strong>{result.quality.status}</strong> · {result.quality.accepted_records} catatan valid · {result.quality.rejected_records} disembunyikan</p>}
          <p>Cakupan: {result.source.coverage}</p>
          <div aria-label="Legenda peta">{datasetLegend(datasetLayer).values.map(item => <p key={item.label}><span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", marginRight: 6, background: item.color }} />{item.label}</p>)}</div>
          {result.message && <p>{result.message}</p>}
          {!result.data.features.length && !result.imagery && !result.systems && <p>No live data available / Tidak ada data untuk kueri ini.</p>}
          <dl><dt>Source</dt><dd><a href={result.source.endpoint} target="_blank" rel="noreferrer">{result.source.provider}</a></dd><dt>Dataset</dt><dd>{result.source.name}</dd><dt>Updated</dt><dd>{formatTime(result.last_updated)}</dd><dt>Fetched</dt><dd>{formatTime(result.fetched_at)}</dd><dt>Last successful update</dt><dd>{formatTime(result.source.last_success)}</dd><dt>TTL</dt><dd>{result.ttl} detik</dd><dt>License</dt><dd>{result.source.license}</dd></dl>
          {result.warnings.map(w => <p className={styles.hint} key={w}>{w}</p>)}
          {result.truncated && <p>Hasil dibatasi. Perkecil area pencarian.</p>}
          {result.imagery && <><label>Opasitas<input type="range" min="0" max="1" step="0.05" value={opacity} onChange={e => setOpacity(Number(e.target.value))} /></label><p>Citra: {formatTime(result.imagery.timestamp)}</p>{result.imagery.legend.map(l => <p key={l.label}>{/* Provider legend is an actual image, not reconstructed colors. */}<Image unoptimized src={l.image} alt={l.label} width={24} height={20} /> {l.label}</p>)}</>}
          {selected && <><button onClick={() => setSelected(null)}>← Semua hasil</button><dl>{Object.entries({ ...selected.properties, freshness: freshness(selected.properties) }).filter(([, v]) => v !== undefined).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value === null ? "Tidak dipublikasikan" : typeof value === "object" ? <details><summary>Lihat data</summary><pre>{JSON.stringify(value, null, 2)}</pre></details> : String(value)}</dd></div>)}</dl>{coordinate && <Link href={`/app?destination_lat=${coordinate[1]}&destination_lon=${coordinate[0]}`}>Rute ke lokasi ini →</Link>}</>}
          {!selected && <><h3>{result.data.features.length} hasil spasial</h3><ul className={styles.records}>{result.data.features.slice(0, 100).map(f => <li key={f.id}><button onClick={() => { setSelected(f); if (f.geometry.type === "Point") mapRef.current?.easeTo({ center: f.geometry.coordinates as [number,number], zoom: 15 }); }}><strong>{f.properties.name}</strong><small>{freshness(f.properties)} · {formatTime(f.properties.timestamp)}</small></button></li>)}</ul>{result.data.features.length > 100 && <p>100 hasil pertama ditampilkan; semua hasil dimuat di peta.</p>}</>}
          <button type="button" disabled={!result.fetched_at} onClick={async () => { setInterpretation("Meminta interpretasi data…"); try { const response = await fetch("/api/international/interpret", { method: "POST", signal: AbortSignal.timeout(55000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layer, query: loadedQueryRef.current }) }); const body = await response.json(); setInterpretation(body.answer ?? body.error ?? "Interpretasi tidak tersedia."); } catch { setInterpretation("Interpretasi tidak tersedia."); } }}>Interpretasi berbasis data</button>
          {interpretation && <p>{interpretation}</p>}
        </>}
      </aside>}
    </div>
  </section>;
}
