"use client";

import { MapPinned, Search, X } from "lucide-react";
import type { FormEvent } from "react";

import type { GlobalSearchIntent, SearchRegion } from "@/src/services/mapid-layer.service";

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
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onToggleRegion: (regionId: string) => void;
  onSearchThisArea: () => void;
  onMaxBudgetChange: (value: string) => void;
  onOpenNowChange: (value: boolean) => void;
  onMaxWalkingMinutesChange: (value: number | null) => void;
}

export function GlobalSearchControls(props: GlobalSearchControlsProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    props.onSubmit();
  };

  return (
    <section className="global-search" aria-labelledby="global-search-label">
      <form className="global-search__form" onSubmit={submit}>
        <label id="global-search-label" htmlFor="global-search-query">
          Pencarian global
        </label>
        <div className="global-search__input-row">
          <Search size={17} aria-hidden="true" />
          <input
            id="global-search-query"
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                props.onSubmit();
              }
            }}
            placeholder="Cari tempat, makanan, atau area..."
            maxLength={120}
            autoComplete="off"
          />
          {props.query || props.selectedRegionIds.length ? (
            <button
              type="button"
              className="global-search__icon-button"
              aria-label="Hapus pencarian"
              title="Hapus pencarian"
              onClick={props.onClear}
            >
              <X size={16} />
            </button>
          ) : null}
          <button
            type="submit"
            className="global-search__submit"
            disabled={props.loading}
            aria-label={props.loading ? "Mencari" : "Cari"}
            title={props.loading ? "Mencari" : "Cari"}
          >
            <Search size={16} />
          </button>
        </div>
      </form>

      <fieldset className="global-search__regions">
        <legend>Cakupan wilayah</legend>
        <label className="global-search__region-option">
          <input
            type="checkbox"
            checked={props.selectedRegionIds.length === 0}
            onChange={props.onClear}
          />
          <span>Area saat ini</span>
        </label>
        {props.regions.map((region) => (
          <label className="global-search__region-option" key={region.id}>
            <input
              type="checkbox"
              checked={props.selectedRegionIds.includes(region.id)}
              onChange={() => props.onToggleRegion(region.id)}
            />
            <span>{region.name}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="global-search__commuter-filters">
        <legend>Filter perjalanan</legend>
        <label>
          <span>Budget maksimum</span>
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            max={10000000}
            step={1000}
            value={props.maxBudget}
            placeholder="Rp30.000"
            onChange={(event) => props.onMaxBudgetChange(event.target.value)}
          />
        </label>
        <label className="global-search__toggle">
          <input
            type="checkbox"
            checked={props.openNow}
            onChange={(event) => props.onOpenNowChange(event.target.checked)}
          />
          <span>Buka sekarang</span>
        </label>
        <label>
          <span>Maksimum jalan kaki</span>
          <select
            value={props.maxWalkingMinutes ?? ""}
            onChange={(event) => props.onMaxWalkingMinutesChange(
              event.target.value ? Number(event.target.value) : null,
            )}
          >
            <option value="">Tanpa batas</option>
            <option value="5">5 menit</option>
            <option value="10">10 menit</option>
            <option value="15">15 menit</option>
            <option value="20">20 menit</option>
            <option value="30">30 menit</option>
          </select>
        </label>
      </fieldset>

      <div className="global-search__status" role="status" aria-live="polite">
        {props.error ? (
          <span className="global-search__error" role="alert">{props.error}</span>
        ) : props.intent ? (
          <span>
            <MapPinned size={14} />
            {props.intent.location_text ??
              (props.intent.scope.type === "CURRENT_VIEWPORT" ? "Area peta saat ini" : "Multi-wilayah")}
            {props.total !== null ? ` - ${props.total} hasil` : ""}
          </span>
        ) : (
          <span><MapPinned size={14} />Area peta saat ini</span>
        )}
        {props.mapMoved ? (
          <button type="button" onClick={props.onSearchThisArea} disabled={props.loading}>
            Cari di area ini
          </button>
        ) : null}
      </div>
    </section>
  );
}
