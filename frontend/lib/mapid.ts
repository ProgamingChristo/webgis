export type BasemapId =
  | "mapid-basic"
  | "mapid-street-2d-building"
  | "mapid-satellite"
  | "mapid-dark"
  | "mapid-light";

type MapidStyleId =
  | "basic"
  | "street-2d-building"
  | "satellite"
  | "dark"
  | "light";

export type BasemapOption = {
  id: BasemapId;
  mapidStyleId: MapidStyleId;
  label: string;
  description: string;
  style: string;
};

export const MAPID_BASEMAP_KEY =
  process.env.NEXT_PUBLIC_MAPID_BASEMAP_KEY?.trim() || null;

const OPEN_FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const MAPID_STYLE_NAME =
  process.env.NEXT_PUBLIC_MAPID_STYLE_NAME?.trim() ||
  "basic";

export const BASEMAP_PREFERENCE_STORAGE_KEY = "getra:basemap:v1";

function mapidGlStyleUrl(styleId: MapidStyleId): string {
  if (!MAPID_BASEMAP_KEY) return OPEN_FALLBACK_STYLE;
  return `https://basemap.mapid.io/styles/${styleId}/style.json?key=${encodeURIComponent(
    MAPID_BASEMAP_KEY,
  )}`;
}

const MAPID_BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: "mapid-basic",
    mapidStyleId: "basic",
    label: "Street",
    description: "MAPID 3D + 2D building",
    style: mapidGlStyleUrl("basic"),
  },
  {
    id: "mapid-street-2d-building",
    mapidStyleId: "street-2d-building",
    label: "Street 2D",
    description: "MAPID 2D building",
    style: mapidGlStyleUrl("street-2d-building"),
  },
  {
    id: "mapid-satellite",
    mapidStyleId: "satellite",
    label: "Satelit",
    description: "MAPID satellite",
    style: mapidGlStyleUrl("satellite"),
  },
  {
    id: "mapid-dark",
    mapidStyleId: "dark",
    label: "Dark",
    description: "MAPID dark",
    style: mapidGlStyleUrl("dark"),
  },
  {
    id: "mapid-light",
    mapidStyleId: "light",
    label: "Light",
    description: "MAPID light",
    style: mapidGlStyleUrl("light"),
  },
];

export const BASEMAP_OPTIONS: BasemapOption[] = MAPID_BASEMAP_KEY
  ? MAPID_BASEMAP_OPTIONS
  : [{
      id: "mapid-basic",
      mapidStyleId: "basic",
      label: "Street",
      description: "OpenStreetMap via OpenFreeMap",
      style: OPEN_FALLBACK_STYLE,
    }];

export const FALLBACK_MAP_STYLE =
  BASEMAP_OPTIONS[0]?.style ?? OPEN_FALLBACK_STYLE;

export function getDefaultBasemapId(): BasemapId {
  return (
    BASEMAP_OPTIONS.find(
      (option) => option.mapidStyleId === MAPID_STYLE_NAME,
    )?.id ?? "mapid-basic"
  );
}

export function isBasemapId(value: unknown): value is BasemapId {
  return typeof value === "string" && BASEMAP_OPTIONS.some((option) => option.id === value);
}

export function getPreferredBasemapId(): BasemapId {
  if (typeof window === "undefined") return getDefaultBasemapId();
  try {
    const stored = window.localStorage.getItem(BASEMAP_PREFERENCE_STORAGE_KEY);
    return isBasemapId(stored) ? stored : getDefaultBasemapId();
  } catch {
    return getDefaultBasemapId();
  }
}

export function persistBasemapPreference(basemapId: BasemapId): void {
  if (typeof window === "undefined" || !isBasemapId(basemapId)) return;
  try {
    window.localStorage.setItem(BASEMAP_PREFERENCE_STORAGE_KEY, basemapId);
  } catch {
    // A blocked storage policy must not make the map unusable.
  }
}

export function getBasemapOption(
  basemapId: BasemapId,
): BasemapOption {
  return (
    BASEMAP_OPTIONS.find((option) => option.id === basemapId) ??
    BASEMAP_OPTIONS[0]!
  );
}
