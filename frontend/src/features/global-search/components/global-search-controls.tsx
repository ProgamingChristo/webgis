"use client";

import { Clock, LocateFixed, Map, MapPin, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { GlobalSearchIntent, SearchRegion } from "@/src/services/mapid-layer.service";
import type { UserLocation } from "@/types/getra";

interface GlobalSearchControlsProps {
  query: string;
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

export function GlobalSearchControls(props: GlobalSearchControlsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const reference = props.discoveryRadius ? null : props.intent?.reference;
  const locationLabel = reference?.label ?? (props.discoveryRadius ? null : props.intent?.location_text) ?? (props.location ? "Lokasi saya" : "Area peta saat ini");
  const radius = props.discoveryRadius ?? props.canonicalRadius;
  return <section className="commuter-search" aria-label="Pencarian tempat">
    <span className="sr-only" role="status" aria-live="polite">{props.loading ? "Mencari tempat" : props.total !== null ? `${props.total} tempat ditemukan` : "Siap mencari"}</span>
    <form className="commuter-search__form" onSubmit={(event) => { event.preventDefault(); props.onSubmit(); }}>
      <label className="sr-only" htmlFor="global-search-query">Cari tempat</label>
      <div className="commuter-search__input"><Search size={18} /><input id="global-search-query" value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="Cari makanan, tempat, area, atau alamat..." maxLength={120} autoComplete="off" />
        <button type="submit" aria-label="Cari" disabled={props.loading}><Search size={17} /></button>
      </div>
      <button className="commuter-icon" type="button" aria-label="Filter lainnya" aria-expanded={filtersOpen} aria-controls="commuter-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} /></button>
    </form>

    <section className="commuter-section">
      <div className="commuter-section__heading"><h2><MapPin size={17} />Lokasi pencarian</h2><button type="button" onClick={props.onLocate} disabled={props.locating}><LocateFixed size={14} />{props.locating ? "Mengambil lokasi…" : "Gunakan lokasi saya"}</button></div>
      <div className="commuter-location"><MapPin size={21} />
        <div className="commuter-location__name"><strong>{locationLabel} {props.location && (!reference || reference.type === "USER_LOCATION") && !props.intent?.location_text ? <em>(aktif)</em> : null}</strong>
          <small>{reference?.type === "TRANSIT" ? "Acuan stasiun / halte" : props.intent?.location_text ? "Wilayah pencarian" : props.location ? "Lokasi perangkat" : "Geser peta atau aktifkan lokasi"}</small>
        </div>
        <label className="commuter-radius">Radius<select disabled={!props.location && !reference} aria-label="Radius pencarian" value={radius ?? "viewport"} onChange={event => props.discoveryRadius ? props.onDiscoveryRadiusChange?.(Number(event.target.value)) : props.onCanonicalRadiusChange?.(event.target.value === "viewport" ? null : Number(event.target.value))}>
          {!props.discoveryRadius ? <option value="viewport">Area peta</option> : null}
          {[250,500,1000,2000,3000].map(value => <option key={value} value={value}>{value < 1000 ? `${value} m` : `${value / 1000} km`}</option>)}
        </select></label>
      </div>
      {props.locationError ? <p className="location-error" role="alert">{props.locationError}</p> : null}
    </section>

    <section className="commuter-section">
      <div className="commuter-section__heading"><h2>Filter cepat</h2><button type="button" onClick={props.onClear}>Reset</button></div>
      <div className="commuter-chips">
        {reference?.type === "TRANSIT" ? <span className="commuter-chip commuter-chip--reference">Dekat {reference.label}</span> : null}
        {props.query ? <button type="button" className="commuter-chip" aria-label="Hapus kata pencarian" onClick={props.onClearQuery ?? (() => props.onQueryChange(""))}>{props.query}<X size={13} /></button> : null}
        <button type="button" className="commuter-chip" aria-pressed={props.openNow} onClick={() => props.onOpenNowChange(!props.openNow)}><Clock size={15} />Buka sekarang</button>
        {props.maxBudget ? <button type="button" className="commuter-chip" aria-label="Hapus batas anggaran" onClick={() => props.onMaxBudgetChange("")}>≤ Rp{Number(props.maxBudget).toLocaleString("id-ID")}<X size={13} /></button> : null}
        {props.maxWalkingMinutes ? <button type="button" className="commuter-chip" onClick={() => props.onMaxWalkingMinutesChange(null)}>Jalan ≤ {props.maxWalkingMinutes} menit<X size={13} /></button> : null}
        <button type="button" className="commuter-chip" aria-expanded={filtersOpen} aria-controls="commuter-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Plus size={15} />Filter lainnya</button>
      </div>
      <div id="commuter-filters" hidden={!filtersOpen} className="commuter-disclosure">
        <label>Anggaran maksimal<input type="number" inputMode="numeric" min={1000} max={10000000} step={1000} value={props.maxBudget} placeholder="Masukkan anggaran" onChange={(event) => props.onMaxBudgetChange(event.target.value)} /></label>
        {props.location ? <small>Batas jalan kaki mengikuti acuan pencarian.</small> : null}
        <label>Maksimum jalan kaki<select value={props.maxWalkingMinutes ?? ""} disabled={!props.location && !reference} onChange={(event) => props.onMaxWalkingMinutesChange(event.target.value ? Number(event.target.value) : null)}><option value="">Tanpa batas</option>{[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} menit</option>)}</select></label>
        {!props.location ? <small>Aktifkan lokasi untuk membatasi waktu berjalan.</small> : null}
        {props.advanced}
        <button type="button" className="commuter-apply" disabled={props.loading} onClick={() => { props.onSubmit(); setFiltersOpen(false); }}>Terapkan filter</button>
      </div>
      {props.intent?.query_resolution?.correction ? (
        <p className="global-search__correction">
          Menampilkan hasil untuk &quot;{props.intent.query_resolution.canonical}&quot;. Input awal: &quot;{props.intent.original_query}&quot;.
        </p>
      ) : null}
    </section>

    <section className="commuter-section commuter-scope">
      <div className="commuter-section__heading"><h2><Map size={17} />Cakupan pencarian</h2></div>
      <div className="commuter-section__heading"><select aria-label="Cakupan pencarian" value={props.selectedRegionIds.length ? "regions" : "viewport"} onChange={(event) => { if (event.target.value === "viewport") props.onSearchThisArea(); else setRegionsOpen(true); }}><option value="viewport">Area saat ini</option><option value="regions">{props.selectedRegionIds.length ? `${props.selectedRegionIds.length} wilayah dipilih` : "Pilih wilayah"}</option></select><button type="button" aria-expanded={regionsOpen} aria-controls="commuter-regions" onClick={() => setRegionsOpen(!regionsOpen)}>Ubah wilayah</button></div>
      <fieldset id="commuter-regions" hidden={!regionsOpen} className="commuter-disclosure"><legend>Pilih satu atau beberapa wilayah</legend>{props.regions.map((region) => <label className="commuter-region" key={region.id}><input type="checkbox" checked={props.selectedRegionIds.includes(region.id)} onChange={() => props.onToggleRegion(region.id)} />{region.name}</label>)}{!props.regions.length ? <small>Daftar wilayah belum tersedia.</small> : null}</fieldset>
      {props.mapMoved ? <button type="button" className="commuter-apply" onClick={props.onSearchThisArea} disabled={props.loading}>Cari di area ini</button> : null}
    </section>
    {props.error ? <div className="commuter-error" role="alert">Tempat belum dapat dimuat. Coba lagi.<button type="button" onClick={props.onSubmit}>Coba lagi</button></div> : null}
  </section>;
}
