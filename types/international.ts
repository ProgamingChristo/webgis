import type { FeatureCollection, Geometry } from "geojson";

export const INTERNATIONAL_LAYERS = [
  ["weather", "Global Weather Now", "Weather"], ["earthquakes", "Global Earthquake Live", "Earthquakes"],
  ["active-fire", "Active Fire / Hotspot", "Fire"], ["air-quality", "Global Air Quality", "Air Quality"],
  ["places", "Global Place / Geocoding", "Places"], ["elevation", "Global Elevation Query", "Places"],
  ["timezone", "Global Timezone / Sun", "Places"], ["poi", "OpenStreetMap POI", "Places"],
  ["accessibility", "Accessible Facility Finder", "Places"], ["water-refill", "Drinking Water Map", "Places"],
  ["bikeshare", "Global Bike Share", "Mobility"], ["micromobility", "Shared Micromobility", "Mobility"],
  ["ev-charging", "EV Charging Map", "EV"], ["transit-stops", "Global Public Transit POI", "Transit"],
  ["jakarta-transit", "DKI Public Transport", "Transit"], ["flood", "DKI Flood & Water Level", "Flood"],
  ["disaster", "DKI Disaster Map", "Disaster"], ["weather-radar", "BMKG Weather Radar", "Weather"],
  ["weather-satellite", "BMKG Satellite Weather", "Weather"], ["open-data", "Open Data Explorer", "Places"],
] as const;
export type InternationalLayer = typeof INTERNATIONAL_LAYERS[number][0];
export type SourceStatus = "LIVE" | "STALE" | "ERROR" | "AUTH_REQUIRED" | "UNAVAILABLE";
export interface DataQuality {
  status: "FRESH" | "STALE" | "PARTIAL" | "INVALID" | "UNAVAILABLE";
  freshness: "FRESH" | "STALE" | "UNKNOWN";
  completeness: number | null; validity: number | null;
  source_reliability: "PROVIDER_REPORTED";
  timestamp_quality: "PRESENT" | "UNKNOWN" | "PARTIAL" | "NO_RECORDS";
  accepted_records: number; rejected_records: number;
}
export interface InternationalSource {
  id: string; name: string; provider: string; endpoint: string; source_type: string;
  coverage: string; requires_key: boolean; env_key: string | null; license: string;
  attribution: string; refresh_interval: number; last_success: string | null;
  last_failure: string | null; last_verified: string | null; status: SourceStatus;
}
export interface InternationalRecord extends Record<string, unknown> {
  name: string; source: string; dataset: string; timestamp: string | null;
  license: string; freshness: "CURRENT" | "STALE" | "UNKNOWN" | "STATIC";
}
export interface InternationalResult {
  layer: InternationalLayer; status: SourceStatus; message: string | null;
  source: InternationalSource; fetched_at: string | null; last_updated: string | null;
  ttl: number; data: FeatureCollection<Geometry, InternationalRecord>;
  truncated: boolean; warnings: string[];
  quality?: DataQuality;
  cache_status?: "HIT" | "MISS" | "DEDUP";
  imagery?: { url: string; coordinates: [[number, number], [number, number], [number, number], [number, number]]; timestamp: string | null; legend: { label: string; image: string }[] };
  systems?: { id: string; name: string; country: string; location: string }[];
}
export interface InternationalQuery {
  lat: number; lon: number; radius: number; q?: string; category?: string;
  magnitude?: number; adm4?: string; system?: string; source?: string; year?: number;
  points?: [number, number][];
  since?: string; until?: string;
}
export function isInternationalLayer(value: string): value is InternationalLayer { return INTERNATIONAL_LAYERS.some(([id]) => id === value); }
