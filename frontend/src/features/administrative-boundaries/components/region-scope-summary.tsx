"use client";

import { MapPinned, X } from "lucide-react";

import type { SearchRegion } from "@/src/services/mapid-layer.service";

interface RegionScopeSummaryProps {
  selectedRegionIds: string[];
  regions: SearchRegion[];
  boundaryLoading: boolean;
  boundaryError: string | null;
  onRemove: (regionId: string) => void;
}

export function RegionScopeSummary(props: RegionScopeSummaryProps) {
  if (props.selectedRegionIds.length === 0) return null;
  const selected = props.selectedRegionIds.map((id) =>
    props.regions.find((region) => region.id === id) ?? { id, name: id },
  );

  return (
    <section className="region-scope-summary" aria-labelledby="selected-regions-heading">
      <div className="region-scope-summary__heading">
        <MapPinned size={15} aria-hidden="true" />
        <strong id="selected-regions-heading">
          {selected.length} wilayah dipilih
        </strong>
      </div>
      <p className="sr-only" aria-live="polite">
        {`${selected.length} wilayah dipilih: ${selected.map((region) => region.name).join(", ")}.`}
      </p>
      <div className="region-scope-summary__chips">
        {selected.map((region) => (
          <span className="region-chip" key={region.id}>
            {region.name}
            <button
              type="button"
              aria-label={`Hapus wilayah ${region.name}`}
              title={`Hapus ${region.name}`}
              onClick={() => props.onRemove(region.id)}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <p className={props.boundaryError ? "region-boundary-state region-boundary-state--error" : "region-boundary-state"} role="status">
        {props.boundaryError ?? (props.boundaryLoading ? "Memuat boundary wilayah..." : "Boundary dan label wilayah aktif di peta.")}
      </p>
    </section>
  );
}
