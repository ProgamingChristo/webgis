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

/*
 * MAPID basemap keys are public browser credentials: MapLibre must send the
 * key when it requests the GL Style, glyphs, sprites, and vector tiles.
 * The default below is the working GL Style key supplied for this project.
 */
const DEFAULT_MAPID_BASEMAP_KEY =
  "6a808f2a610fe054a12df0a9";

export const MAPID_BASEMAP_KEY =
  process.env.NEXT_PUBLIC_MAPID_BASEMAP_KEY?.trim() ||
  DEFAULT_MAPID_BASEMAP_KEY;

export const MAPID_STYLE_NAME =
  process.env.NEXT_PUBLIC_MAPID_STYLE_NAME?.trim() ||
  "basic";

function mapidGlStyleUrl(styleId: MapidStyleId): string {
  return `https://basemap.mapid.io/styles/${styleId}/style.json?key=${encodeURIComponent(
    MAPID_BASEMAP_KEY,
  )}`;
}

export const BASEMAP_OPTIONS: BasemapOption[] = [
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

export const FALLBACK_MAP_STYLE =
  BASEMAP_OPTIONS[0]?.style ?? mapidGlStyleUrl("basic");

export function getDefaultBasemapId(): BasemapId {
  return (
    BASEMAP_OPTIONS.find(
      (option) => option.mapidStyleId === MAPID_STYLE_NAME,
    )?.id ?? "mapid-basic"
  );
}

export function getBasemapOption(
  basemapId: BasemapId,
): BasemapOption {
  return (
    BASEMAP_OPTIONS.find((option) => option.id === basemapId) ??
    BASEMAP_OPTIONS[0]!
  );
}
