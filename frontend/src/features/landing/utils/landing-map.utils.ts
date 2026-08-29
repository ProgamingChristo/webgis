import type { LandingMapFixture } from "../types/landing.types";
import type * as GeoJSON from "geojson";

/*
 * ILLUSTRATIVE LANDING DATA.
 * NOT PRODUCTION MERCHANT DATA.
 * NO ANALYTICS OR CAMPAIGN ATTRIBUTION.
 */
export const LANDING_MAP_FIXTURE: LandingMapFixture = {
  center: [106.8217, -6.1841],
  corridor: {
    type: "Feature",
    properties: {
      label: "Illustrative transit corridor",
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [106.8012, -6.1692],
        [106.8118, -6.1761],
        [106.8217, -6.1841],
        [106.8326, -6.1908],
        [106.8435, -6.1991],
      ],
    },
  },
  route: {
    type: "Feature",
    properties: {
      label: "Illustrative pedestrian route",
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [106.8217, -6.1841],
        [106.8244, -6.186],
        [106.8278, -6.1888],
        [106.8316, -6.1918],
      ],
    },
  },
  serviceArea: {
    type: "Feature",
    properties: {
      label: "Illustrative 10-minute catchment",
    },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [106.8128, -6.1781],
        [106.8198, -6.1734],
        [106.8292, -6.1747],
        [106.8373, -6.1829],
        [106.8384, -6.1932],
        [106.8312, -6.2015],
        [106.8184, -6.1997],
        [106.8109, -6.1904],
        [106.8128, -6.1781],
      ]],
    },
  },
  points: [
    {
      id: "transit-node",
      label: "Transit node",
      kind: "transit",
      coordinates: [106.8217, -6.1841],
    },
    {
      id: "umkm-1",
      label: "UMKM original result",
      kind: "umkm",
      coordinates: [106.8316, -6.1918],
    },
    {
      id: "umkm-2",
      label: "Hidden gem example",
      kind: "hidden-gem",
      coordinates: [106.8161, -6.1884],
    },
    {
      id: "umkm-3",
      label: "Sponsored example",
      kind: "sponsored",
      coordinates: [106.8293, -6.1792],
    },
  ],
};

export function toPointFeatureCollection(
  fixture: LandingMapFixture,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: fixture.points.map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        label: point.label,
        kind: point.kind,
      },
      geometry: {
        type: "Point",
        coordinates: point.coordinates,
      },
    })),
  };
}
