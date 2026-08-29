"use client";

import {
  Building2,
  Layers3,
  MapPinned,
  ReceiptText,
  Store,
} from "lucide-react";

import type {
  ContextualLayerData,
  ContextualLayerKey,
  ContextualLayerVisibility,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";

interface ContextualLayerControlProps {
  data: ContextualLayerData;
  onChange: (layer: ContextualLayerKey, visible: boolean) => void;
  visibility: ContextualLayerVisibility;
}

const options = [
  { key: "merchant", label: "Merchant", Icon: Store },
  { key: "property", label: "Properti", emptyLabel: "observasi properti", Icon: Building2, source: "PROPERTI_GO" },
  { key: "transaction", label: "Observasi transaksi", emptyLabel: "observasi transaksi", Icon: ReceiptText, source: "STRUK_GO" },
  { key: "activities", label: "Observasi lapangan", emptyLabel: "observasi lapangan", Icon: MapPinned, source: "ACTIVITIES" },
  { key: "boundary", label: "Batas administrasi", Icon: Layers3 },
] as const;

export function ContextualLayerControl({
  data,
  onChange,
  visibility,
}: ContextualLayerControlProps) {
  return (
    <details className="contextual-layer-control" data-testid="contextual-layer-control">
      <summary>
        <Layers3 size={17} aria-hidden="true" />
        <span>Layers</span>
      </summary>
      <div className="contextual-layer-control__panel">
        <strong>Layer peta</strong>
        {options.map(({ key, label, Icon, ...option }) => {
          const source = "source" in option ? option.source : null;
          const status = source ? data[source] : null;
          return (
            <label key={key} className="contextual-layer-option">
              <input
                type="checkbox"
                checked={visibility[key]}
                onChange={(event) => onChange(key, event.target.checked)}
              />
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {visibility[key] && status ? (
                <small role="status">
                  {status.loading
                    ? "Memuat"
                    : status.error
                      ? "Gagal"
                      : `${status.collection.features.length}`}
                </small>
              ) : null}
            </label>
          );
        })}
        <div className="contextual-layer-legend" aria-label="Legenda layer kontekstual">
          <span><i className="legend-swatch legend-swatch--property" /> Properti</span>
          <span><i className="legend-swatch legend-swatch--transaction" /> Transaksi</span>
          <span><i className="legend-swatch legend-swatch--activity" /> Lapangan</span>
        </div>
        {options.flatMap(({ key, ...option }) => {
          if (!("source" in option) || !visibility[key]) return [];
          const status = data[option.source];
          if (status.error) {
            return [<p key={`${key}-error`} className="contextual-layer-message contextual-layer-message--error">{status.error}</p>];
          }
          if (!status.loading && status.collection.features.length === 0) {
            return [<p key={`${key}-empty`} className="contextual-layer-message">Tidak ada {option.emptyLabel} di viewport ini.</p>];
          }
          return [];
        })}
      </div>
    </details>
  );
}
