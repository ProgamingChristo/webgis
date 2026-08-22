import type { StyleSpecification } from "maplibre-gl";

export type BasemapId =
  | "osm"
  | "dark"
  | "satellite";

export type BasemapOption = {
  id: BasemapId;
  label: string;
  description: string;
  style: StyleSpecification;
};

export const MAPID_STYLE_NAME =
  process.env.NEXT_PUBLIC_MAPID_STYLE_NAME?.trim() ||
  "street-2d-building";

function getPublicStyleUrl(value: string | undefined): string {
  if (!value?.trim()) return "";

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";

    const sensitiveParameter =
      /^(api[-_]?key|access[-_]?token|authorization|secret|token)$/i;

    for (const key of url.searchParams.keys()) {
      if (sensitiveParameter.test(key)) return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

export const MAPID_STYLE_URL =
  getPublicStyleUrl(
    process.env.NEXT_PUBLIC_MAPID_STYLE_URL,
  );

export const OSM_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "GETRA OpenStreetMap",
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm-raster",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const DARK_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "GETRA Dark",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export const SATELLITE_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "GETRA Satellite",
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    {
      id: "esri-world-imagery",
      type: "raster",
      source: "esri-world-imagery",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: "osm",
    label: "Street",
    description: "OpenStreetMap",
    style: OSM_MAP_STYLE,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Carto Dark",
    style: DARK_MAP_STYLE,
  },
  {
    id: "satellite",
    label: "Satelit",
    description: "Esri World Imagery",
    style: SATELLITE_MAP_STYLE,
  },
];

export const FALLBACK_MAP_STYLE =
  OSM_MAP_STYLE;

export function getMapStyle(): string | StyleSpecification {
  if (MAPID_STYLE_URL) {
    return MAPID_STYLE_URL;
  }

  return FALLBACK_MAP_STYLE;
}
