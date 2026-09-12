"use client";

import { Clock, LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { GlobalSearchIntent, SearchRegion } from "@/src/services/mapid-layer.service";
import type { UserLocation } from "@/types/getra";

interface GlobalSearchControlsProps {
  query: string;
  suggestions?: Array<{ id: string; label: string; detail?: string }>;
  regions: SearchRegion[];
  selectedRegionIds: string[];
  intent: GlobalSearchIntent | null;
  loading: boolean;
  error: string | null;
  total: number | null;
  mapMoved: boolean;
  maxBudget: string;
  openNow: boolean;
  maxWalkingMinutes: number | null;
  onClearQuery?: () => void;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onToggleRegion: (regionId: string) => void;
  onSearchThisArea: () => void;
  onMaxBudgetChange: (value: string) => void;
  onOpenNowChange: (value: boolean) => void;
  onMaxWalkingMinutesChange: (value: number | null) => void;
  location: UserLocation | null;
  locating: boolean;
  locationError: string | null;
  onLocate: () => void;
  advanced?: ReactNode;
  canonicalRadius?: number;
  onCanonicalRadiusChange?: (radius: number | null) => void;
  discoveryRadius?: number;
  onDiscoveryRadiusChange?: (radius: number) => void;
}

function formatRadius(radius: number | null | undefined) {
  if (!radius) return "Area peta";
  return radius < 1000 ? `${radius} m` : `${radius / 1000} km`;
}

export function GlobalSearchControls(props: GlobalSearchControlsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const reference = props.discoveryRadius ? null : props.intent?.reference;
  const locationLabel = reference?.label
    ?? (props.discoveryRadius ? null : props.intent?.location_text)
    ?? (props.location ? "Lokasi saya" : "Area peta saat ini");
  const radius = props.discoveryRadius ?? props.canonicalRadius;
  const radiusDisabled = !props.location && !reference;
  const radiusLabel = formatRadius(radius);
  const clearQuery = props.onClearQuery ?? (() => props.onQueryChange(""));
  const setRadius = (value: number) => {
    if (props.discoveryRadius !== undefined) props.onDiscoveryRadiusChange?.(value);
    else props.onCanonicalRadiusChange?.(value);
  };

  return <section className="commuter-search" aria-label="Pencarian tempat">
    <span className="sr-only" role="status" aria-live="polite">
      {props.loading ? "Mencari tempat" : props.total !== null ? `${props.total} tempat ditemukan` : "Siap mencari"}
    </span>

    <div className="commuter-area-bar">
      <span><MapPin size={13} aria-hidden="true" />Peta <strong>{locationLabel}</strong></span>
      <button type="button" aria-expanded={regionsOpen} aria-controls="commuter-regions" onClick={() => setRegionsOpen(!regionsOpen)}>Ganti area</button>
    </div>

    <form className="commuter-search__form" onSubmit={(event) => { event.preventDefault(); props.onSubmit(); }}>
      <label className="sr-only" htmlFor="global-search-query">Cari tempat</label>
      <div className="commuter-search__input">
        <Search size={16} aria-hidden="true" />
        <input id="global-search-query" list="global-search-suggestions" value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="Cari tempat, UMKM, halte, atau area" maxLength={120} autoComplete="off" />
        {props.query
          ? <button type="button" aria-label="Hapus kata pencarian" onClick={clearQuery}><X size={15} /></button>
          : <button type="submit" aria-label="Cari" disabled={props.loading}><Search size={15} /></button>}
      </div>
      {props.suggestions?.length ? <datalist id="global-search-suggestions">{props.suggestions.map((suggestion) => <option key={suggestion.id} value={suggestion.label}>{suggestion.detail}</option>)}</datalist> : null}
    </form>

    <div className="commuter-filter-bar">
      <button className="commuter-filter-trigger" type="button" aria-expanded={filtersOpen} aria-controls="commuter-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={14} />Filter</button>
      <button className="commuter-radius-state" type="button" disabled={radiusDisabled} aria-expanded={filtersOpen} aria-controls="commuter-filters" onClick={() => setFiltersOpen(true)}>Radius {radiusLabel}</button>
    </div>

    {(props.query || radius || props.openNow || props.maxBudget || props.maxWalkingMinutes || reference?.type === "TRANSIT") ? <div className="commuter-chips" aria-label="Filter aktif">
      {reference?.type === "TRANSIT" ? <span className="commuter-chip commuter-chip--reference">Dekat {reference.label}</span> : null}
      {props.query ? <button type="button" className="commuter-chip commuter-chip--active" onClick={clearQuery}>{props.query}<X size={12} /></button> : null}
      {radius ? <button type="button" className="commuter-chip" disabled={props.discoveryRadius !== undefined} onClick={() => props.onCanonicalRadiusChange?.(null)}>Radius {radiusLabel}{props.discoveryRadius === undefined ? <X size={12} /> : null}</button> : null}
      {props.openNow ? <button type="button" className="commuter-chip" onClick={() => props.onOpenNowChange(false)}><Clock size={13} />Buka sekarang<X size={12} /></button> : null}
      {props.maxBudget ? <button type="button" className="commuter-chip" onClick={() => props.onMaxBudgetChange("")}>Maks. Rp{Number(props.maxBudget).toLocaleString("id-ID")}<X size={12} /></button> : null}
      {props.maxWalkingMinutes ? <button type="button" className="commuter-chip" onClick={() => props.onMaxWalkingMinutesChange(null)}>Jalan maks. {props.maxWalkingMinutes} mnt<X size={12} /></button> : null}
    </div> : null}

    <div id="commuter-filters" hidden={!filtersOpen} className="commuter-filter-panel">
      <header><strong>Filter Pencarian</strong><button type="button" aria-label="Tutup filter" onClick={() => setFiltersOpen(false)}><X size={15} /></button></header>
      <fieldset disabled={radiusDisabled}>
        <legend>Radius</legend>
        <div className="commuter-radius-options">
          {[500, 1000, 2000, 5000].map((value) => <button type="button" key={value} aria-pressed={radius === value} onClick={() => setRadius(value)}>{formatRadius(value)}</button>)}
        </div>
      </fieldset>
      {radiusDisabled ? <small>Aktifkan lokasi atau pilih acuan agar radius dapat digunakan.</small> : null}
      {props.advanced ? <fieldset><legend>Brand</legend>{props.advanced}</fieldset> : null}
      <fieldset><legend>Kisaran harga</legend><label>Anggaran maksimal<input type="number" inputMode="numeric" min={1000} max={10000000} step={1000} value={props.maxBudget} placeholder="Contoh: 20000" onChange={(event) => props.onMaxBudgetChange(event.target.value)} /></label></fieldset>
      <label className="commuter-check"><input type="checkbox" checked={props.openNow} onChange={(event) => props.onOpenNowChange(event.target.checked)} />Buka sekarang</label>
      <label className="commuter-filter-select">Maksimum jalan kaki<select value={props.maxWalkingMinutes ?? ""} disabled={radiusDisabled} onChange={(event) => props.onMaxWalkingMinutesChange(event.target.value ? Number(event.target.value) : null)}><option value="">Tanpa batas</option>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} menit</option>)}</select></label>
      <footer><button type="button" onClick={props.onClear}>Reset</button><button type="button" className="commuter-apply" disabled={props.loading} onClick={() => { props.onSubmit(); setFiltersOpen(false); }}>Terapkan Filter</button></footer>
    </div>

    <div id="commuter-regions" hidden={!regionsOpen} className="commuter-region-panel">
      <div className="commuter-location-action"><button type="button" onClick={props.onLocate} disabled={props.locating}><LocateFixed size={14} />{props.locating ? "Mengambil lokasi…" : "Gunakan lokasi saya"}</button></div>
      <fieldset><legend>Pilih satu atau beberapa wilayah</legend>{props.regions.map((region) => <label className="commuter-region" key={region.id}><input type="checkbox" checked={props.selectedRegionIds.includes(region.id)} onChange={() => props.onToggleRegion(region.id)} />{region.name}</label>)}{!props.regions.length ? <small>Daftar wilayah belum tersedia.</small> : null}</fieldset>
      <button type="button" className="commuter-apply" onClick={() => { props.onSearchThisArea(); setRegionsOpen(false); }} disabled={props.loading}>Gunakan area peta saat ini</button>
    </div>

    {props.locationError ? <p className="location-error" role="alert">{props.locationError}</p> : null}
    {props.mapMoved ? <button type="button" className="commuter-search-area" onClick={props.onSearchThisArea} disabled={props.loading}>Cari di area peta ini</button> : null}
    {props.intent?.query_resolution?.correction ? <p className="global-search__correction">Menampilkan hasil untuk &quot;{props.intent.query_resolution.canonical}&quot;. Input awal: &quot;{props.intent.original_query}&quot;.</p> : null}
    {props.error ? <div className="commuter-error" role="alert">Tempat belum dapat dimuat. Coba lagi.<button type="button" onClick={props.onSubmit}>Coba lagi</button></div> : null}
  </section>;
}
