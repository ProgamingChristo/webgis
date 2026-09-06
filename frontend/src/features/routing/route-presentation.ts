import type { RoutingCandidate } from "@/src/services/routing.service";

const ROAD_MARKER = /(?:\b(?:onto|on|along|via|toward|towards|ke|menuju|melalui)\s+)((?:(?:Jl\.?|Jalan|Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Boulevard|Blvd\.?)\s+[^,.]+))/i;

export function formatRouteDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteMinutes(seconds: number): string {
  return `${Math.max(1, Math.ceil(seconds / 60))} menit`;
}

export function getRouteIdentity(candidate: RoutingCandidate, index: number): string {
  for (const maneuver of candidate.maneuvers) {
    const match = maneuver.instruction.match(ROAD_MARKER);
    const road = match?.[1]?.trim();
    if (road) return `Lewat ${road}`;
  }
  return `Rute ${index + 1}`;
}

export function getRouteContext(candidate: RoutingCandidate): string[] {
  return [
    candidate.has_toll ? "Tol" : null,
    candidate.has_highway ? "Jalan utama" : null,
    candidate.has_ferry ? "Penyeberangan" : null,
  ].filter((value): value is string => value !== null);
}

export function getRouteLabelAnchor(candidate: RoutingCandidate, index: number, count: number): [number, number] | null {
  const coordinates = candidate.geometry.coordinates;
  if (coordinates.length < 2) return coordinates[0] ?? null;

  const lengths = coordinates.slice(1).map((coordinate, coordinateIndex) => {
    const previous = coordinates[coordinateIndex];
    const averageLatitude = ((previous[1] + coordinate[1]) / 2) * Math.PI / 180;
    const longitudeDelta = (coordinate[0] - previous[0]) * Math.cos(averageLatitude);
    const latitudeDelta = coordinate[1] - previous[1];
    return Math.hypot(longitudeDelta, latitudeDelta);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) return coordinates[Math.floor(coordinates.length / 2)] ?? null;

  const spread = count > 1 ? (index / (count - 1) - 0.5) * 0.34 : 0;
  const target = total * (0.52 + spread);
  let traversed = 0;
  for (let segmentIndex = 0; segmentIndex < lengths.length; segmentIndex += 1) {
    const length = lengths[segmentIndex];
    if (traversed + length >= target) {
      const ratio = length === 0 ? 0 : (target - traversed) / length;
      const start = coordinates[segmentIndex];
      const end = coordinates[segmentIndex + 1];
      return [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
    }
    traversed += length;
  }
  return coordinates.at(-1) ?? null;
}
