"use client";

import { Clock, LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { GlobalSearchIntent, SearchRegion } from "@/src/services/mapid-layer.service";
import type { UserLocation } from "@/types/getra";

interface GlobalSearchControlsProps {
  query: string;
  suggestions?: Array<{ id: string; label: string; detail?: string }>;
  regions: Array<SearchRegion | Pick<SearchRegion, "id" | "name">>;
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
  onToggleRegion: (regionId: string, exclusive?: boolean) => void;
  onSearchThisArea: () => void;
  onMaxBudgetChange: (value: string) => void;
  onOpenNowChange: (value: boolean) => void;
  onMaxWalkingMinutesChange: (value: number | null) => void;
  location: UserLocation | null;
  locating: boolean;
  locationError: string | null;
  onLocate: () => void;
  onRetry?: () => void;
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
  const [disclosure, setDisclosure] = useState<"FILTER" | "AREA" | null>(null);
  const [showAdvancedRegions, setShowAdvancedRegions] = useState(false);
  const filtersOpen = disclosure === "FILTER";
  const regionsOpen = disclosure === "AREA";
  const reference = props.discoveryRadius ? null : props.intent?.reference;
  const locationLabel = reference?.label
    ?? (props.discoveryRadius ? null : props.intent?.location_text)
    ?? (props.location ? "Lokasi saya" : "Area peta saat ini");
  const radius = props.discoveryRadius ?? props.canonicalRadius;
  const hasPointReference = Boolean(reference || props.intent?.origin);
  const radiusDisabled = !hasPointReference;
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
      <button type="button" aria-expanded={regionsOpen} aria-controls="commuter-regions" onClick={() => setDisclosure(regionsOpen ? null : "AREA")}>Ganti area</button>
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
      <button className="commuter-filter-trigger" type="button" aria-expanded={filtersOpen} aria-controls="commuter-filters" onClick={() => setDisclosure(filtersOpen ? null : "FILTER")}><SlidersHorizontal size={14} />Filter</button>
      <button className="commuter-radius-state" type="button" disabled={radiusDisabled} aria-expanded={filtersOpen} aria-controls="commuter-filters" onClick={() => setDisclosure("FILTER")}>{radius && hasPointReference ? `Radius ${radiusLabel}` : props.selectedRegionIds.length === 1 ? props.regions.find((region) => region.id === props.selectedRegionIds[0])?.name ?? "Wilayah" : props.selectedRegionIds.length > 1 ? `${props.selectedRegionIds.length} wilayah` : "Area peta"}</button>
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
      <header><strong>Filter Pencarian</strong><button type="button" aria-label="Tutup filter" onClick={() => setDisclosure(null)}><X size={15} /></button></header>
      {hasPointReference ? <fieldset>
        <legend>Radius</legend>
        <div className="commuter-radius-options">
          {[500, 1000, 2000, 5000].map((value) => <button type="button" key={value} aria-pressed={radius === value} onClick={() => setRadius(value)}>{formatRadius(value)}</button>)}
        </div>
      </fieldset> : null}
      <fieldset><legend>Harga maksimal</legend><label><span className="sr-only">Harga maksimal</span><input type="number" inputMode="numeric" min={1000} max={10000000} step={1000} value={props.maxBudget} placeholder="Contoh: 20000" onChange={(event) => props.onMaxBudgetChange(event.target.value)} /></label></fieldset>
      <label className="commuter-check"><input type="checkbox" checked={props.openNow} onChange={(event) => props.onOpenNowChange(event.target.checked)} />Buka sekarang</label>
      {hasPointReference ? <label className="commuter-filter-select">Maksimum jalan kaki<select value={props.maxWalkingMinutes ?? ""} onChange={(event) => props.onMaxWalkingMinutesChange(event.target.value ? Number(event.target.value) : null)}><option value="">Tanpa batas</option>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} menit</option>)}</select></label> : null}
      <footer><button type="button" onClick={props.onClear}>Reset</button><button type="button" className="commuter-apply" disabled={props.loading} onClick={() => { props.onSubmit(); setDisclosure(null); }}>Terapkan Filter</button></footer>
    </div>

    <div id="commuter-regions" hidden={!regionsOpen} className="commuter-region-panel">
      <div className="commuter-location-action"><button type="button" onClick={props.onLocate} disabled={props.locating}><LocateFixed size={14} />{props.locating ? "Mengambil lokasi…" : "Gunakan lokasi saya"}</button></div>
      <fieldset><legend>{showAdvancedRegions ? "Pilih beberapa wilayah" : "Pilih satu wilayah"}</legend>{props.regions.map((region) => <label className="commuter-region" key={region.id}><input type={showAdvancedRegions ? "checkbox" : "radio"} name={showAdvancedRegions ? undefined : "commuter-region"} checked={props.selectedRegionIds.includes(region.id)} onChange={() => props.onToggleRegion(region.id, !showAdvancedRegions)} />{region.name}</label>)}</fieldset>
      <button type="button" className="commuter-region-advanced" onClick={() => setShowAdvancedRegions((value) => !value)}>{showAdvancedRegions ? "Pilih satu wilayah" : "Pilih beberapa wilayah"}</button>
      <button type="button" className="commuter-apply" onClick={() => { props.onSearchThisArea(); setDisclosure(null); }} disabled={props.loading}>Gunakan area peta saat ini</button>
    </div>

    {props.locationError ? <div className="commuter-location-error" role="alert"><span>{props.locationError}</span><button type="button" onClick={props.onLocate} disabled={props.locating}>{props.locating ? "Mengambil lokasi…" : "Aktifkan lokasi saya"}</button></div> : null}
    {props.mapMoved ? <button type="button" className="commuter-search-area" onClick={props.onSearchThisArea} disabled={props.loading}>Cari di area peta ini</button> : null}
    {props.intent?.query_resolution?.correction ? <p className="global-search__correction">Menampilkan hasil untuk &quot;{props.intent.query_resolution.canonical}&quot;. Input awal: &quot;{props.intent.original_query}&quot;.</p> : null}
    {props.error ? <div className="commuter-error" role="alert"><span>{props.error}</span><button type="button" onClick={props.onRetry ?? props.onSubmit}>Coba lagi</button></div> : null}
  </section>;
}
