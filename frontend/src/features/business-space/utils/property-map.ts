import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { BusinessSpaceCandidate, BusinessSpaceCandidateDetail, BusinessSpaceViewport } from "../types/business-space.types";
import { normalizePropertyViewport } from "./property-viewport";

export const PROPERTY_SOURCE_ID = "business-space-points";
export const PROPERTY_LAYER_ID = "business-space-candidates";

export function syncBusinessSpaceMap(map: MapLibreMap | null, state: {
  candidates: BusinessSpaceCandidate[];
  selectedId: string | null;
  comparison: BusinessSpaceCandidateDetail[];
}) {
  const source = map?.getSource(PROPERTY_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) return;
  const comparisonIds = new Set(state.comparison.map((item) => item.candidate.id));
  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: state.candidates
      .filter((candidate) => Number.isFinite(candidate.longitude) && Number.isFinite(candidate.latitude)
        && Math.abs(candidate.longitude) <= 180 && Math.abs(candidate.latitude) <= 90)
      .map((candidate) => ({
        type: "Feature" as const,
        id: candidate.id,
        geometry: { type: "Point" as const, coordinates: [candidate.longitude, candidate.latitude] },
        properties: {
          id: candidate.id,
          selected: candidate.id === state.selectedId,
          comparison: comparisonIds.has(candidate.id),
        },
      })),
  };
  // Updating results or choosing a property must never move the user's camera.
  source.setData(points);
}

export function subscribePropertyViewport(map: MapLibreMap, onViewportChange: (viewport: BusinessSpaceViewport) => void) {
  const emit = () => {
    const bounds = map.getBounds();
    const viewport = normalizePropertyViewport({
      west: bounds.getWest(), south: bounds.getSouth(),
      east: bounds.getEast(), north: bounds.getNorth(),
    });
    if (viewport) onViewportChange(viewport);
  };
  map.on("moveend", emit);
  emit();
  return () => { map.off("moveend", emit); };
}
