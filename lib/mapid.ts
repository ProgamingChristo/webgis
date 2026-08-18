import type { StyleSpecification } from "maplibre-gl";

export const MAPID_STYLE_NAME =
  process.env.NEXT_PUBLIC_MAPID_STYLE_NAME?.trim() ||
  "street-2d-building";

export const MAPID_STYLE_URL =
  process.env.NEXT_PUBLIC_MAPID_STYLE_URL?.trim() || "";

export const FALLBACK_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "GETRA fallback",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#071018",
      },
    },
  ],
};

export function getMapStyle(): string | StyleSpecification {
  if (MAPID_STYLE_URL) {
    return MAPID_STYLE_URL;
  }

  return FALLBACK_MAP_STYLE;
}