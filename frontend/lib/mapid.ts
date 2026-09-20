import type { StyleSpecification } from "maplibre-gl";

export const DEFAULT_BASEMAP_ID = "mapid-default" as const;
export type BasemapId = "mapid-default" | "osm" | "carto-dark" | "carto-light" | "esri-satellite";
export type BasemapOption = {
  id: BasemapId; label: string; description: string; provider: string;
  type: "vector" | "raster"; attribution: string; style: string | StyleSpecification;
};
export const BASEMAP_PREFERENCE_STORAGE_KEY = "getra:basemap:v2";

function raster(id: string, tiles: string[], attribution: string, maxzoom = 19): StyleSpecification {
  return { version: 8, name: id, metadata: { "getra:basemap": id },
    glyphs: "/api/basemap/mapid/fonts/{fontstack}/{range}.pbf",
    sources: { [id]: { type: "raster", tiles, tileSize: 256, maxzoom, attribution } },
    layers: [{ id, type: "raster", source: id }] };
}
const osm = "© OpenStreetMap contributors";
export const BASEMAP_OPTIONS: BasemapOption[] = [
  { id: "mapid-default", label: "MAPID", description: "Default GETRA basemap", provider: "MAPID", type: "vector", attribution: "MAPID · © OpenStreetMap contributors", style: "/api/basemap/mapid/styles/default/style.json" },
  { id: "osm", label: "OpenStreetMap", description: "Open community map", provider: "OpenStreetMap", type: "raster", attribution: osm, style: raster("osm", ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], osm) },
  { id: "carto-light", label: "Carto Light", description: "Light urban map", provider: "CARTO", type: "raster", attribution: `${osm} · © CARTO`, style: raster("carto-light", ["/api/basemap/carto/light_all/{z}/{x}/{y}.png"], `${osm} · © CARTO`) },
  { id: "carto-dark", label: "Carto Dark", description: "Dark urban map", provider: "CARTO", type: "raster", attribution: `${osm} · © CARTO`, style: raster("carto-dark", ["/api/basemap/carto/dark_all/{z}/{x}/{y}.png"], `${osm} · © CARTO`) },
  { id: "esri-satellite", label: "Esri Satellite", description: "Satellite imagery", provider: "Esri", type: "raster", attribution: "© Esri and contributors", style: raster("esri-satellite", ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], "© Esri and contributors", 18) },
];
export const FALLBACK_MAP_STYLE = BASEMAP_OPTIONS[0].style;
export function getDefaultBasemapId(): BasemapId { return DEFAULT_BASEMAP_ID; }
export function isBasemapId(value: unknown): value is BasemapId { return BASEMAP_OPTIONS.some(option => option.id === value); }
export function getPreferredBasemapId(): BasemapId {
  if (typeof window === "undefined") return DEFAULT_BASEMAP_ID;
  try {
    if (!window.sessionStorage.getItem(BASEMAP_PREFERENCE_STORAGE_KEY)) {
      window.sessionStorage.setItem(BASEMAP_PREFERENCE_STORAGE_KEY, "1");
      window.localStorage.setItem(BASEMAP_PREFERENCE_STORAGE_KEY, DEFAULT_BASEMAP_ID);
    }
    const value = window.localStorage.getItem(BASEMAP_PREFERENCE_STORAGE_KEY);
    return isBasemapId(value) ? value : DEFAULT_BASEMAP_ID;
  } catch { return DEFAULT_BASEMAP_ID; }
}
export function persistBasemapPreference(id: BasemapId): void {
  if (typeof window === "undefined" || !isBasemapId(id)) return;
  try { window.localStorage.setItem(BASEMAP_PREFERENCE_STORAGE_KEY, id); } catch { /* Storage is optional. */ }
  window.dispatchEvent(new Event("getra:basemap"));
}
export function getBasemapOption(id: BasemapId): BasemapOption { return BASEMAP_OPTIONS.find(option => option.id === id) ?? BASEMAP_OPTIONS[0]; }
