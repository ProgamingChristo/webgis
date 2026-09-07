"use client";

import { useState } from "react";
import { Check, Crosshair } from "lucide-react";
import type { Coordinate } from "@/src/types/spatial";
import styles from "../routing-controls.module.css";

export function CoordinateEntry({ label, coordinate, onSelect }: {
  label: "Asal" | "Tujuan";
  coordinate: Coordinate | null;
  onSelect: (point: Coordinate) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return <details className={styles.coordinateEntry}>
    <summary><Crosshair size={14} aria-hidden="true" /> Koordinat {label.toLowerCase()}</summary>
    <form key={`${coordinate?.latitude}:${coordinate?.longitude}`} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const latitude = Number(data.get("latitude"));
      const longitude = Number(data.get("longitude"));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        setError("Koordinat tidak valid.");
        return;
      }
      setError(null);
      onSelect({ latitude, longitude });
      const details = event.currentTarget.closest("details");
      if (details) details.open = false;
    }}>
      <label>Latitude<input aria-label={`Latitude ${label}`} name="latitude" type="number" step="any" min="-90" max="90" required defaultValue={coordinate?.latitude ?? ""} /></label>
      <label>Longitude<input aria-label={`Longitude ${label}`} name="longitude" type="number" step="any" min="-180" max="180" required defaultValue={coordinate?.longitude ?? ""} /></label>
      <button type="submit" aria-label={`Terapkan koordinat ${label.toLowerCase()}`} title={`Terapkan koordinat ${label.toLowerCase()}`}><Check size={18} /></button>
    </form>
    {error ? <p role="alert">{error}</p> : null}
  </details>;
}
