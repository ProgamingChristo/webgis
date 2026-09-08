import type { RoutingCandidate } from "@/src/services/routing.service";

const ROAD_MARKER = /(?:\b(?:onto|on|along|via|toward|towards|ke|menuju|melalui)\s+)((?:(?:Jl\.?|Jalan|Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Boulevard|Blvd\.?)\s+[^,.]+))/i;

export function formatRouteDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteMinutes(seconds: number): string {
  return `${Math.max(1, Math.ceil(seconds / 60))} menit`;
}

export function getRouteIdentity(
  candidate: RoutingCandidate,
  index: number,
  allCandidates?: RoutingCandidate[],
): string {
  const roadDistances = new Map<string, number>();
  for (const maneuver of candidate.maneuvers) {
    const match = maneuver.instruction.match(ROAD_MARKER);
    const road = match?.[1]?.trim().replace(/[.,;:]+$/, "");
    if (road && road.length >= 3) {
      roadDistances.set(road, (roadDistances.get(road) ?? 0) + (maneuver.distance_meters || 1));
    }
  }

  const sortedRoads = [...roadDistances.entries()].sort((a, b) => b[1] - a[1]);

  if (sortedRoads.length > 0) {
    if (allCandidates && allCandidates.length > 1) {
      const otherTopRoads = new Set(
        allCandidates
          .filter((other) => other.route_id !== candidate.route_id)
          .map((other) => {
            for (const m of other.maneuvers) {
              const match = m.instruction.match(ROAD_MARKER);
              if (match?.[1]) return match[1].trim().replace(/[.,;:]+$/, "");
            }
            return null;
          })
          .filter(Boolean),
      );

      const distinctive = sortedRoads.find(([road]) => !otherTopRoads.has(road));
      const chosen = distinctive ? distinctive[0] : sortedRoads[0][0];
      return `Lewat ${chosen}`;
    }

    return `Lewat ${sortedRoads[0][0]}`;
  }

  return `Rute ${index + 1}`;
}

export interface RouteCandidateDelta {
  timeDeltaSeconds: number;
  timeDeltaMinutes: number;
  distanceDeltaMeters: number;
  formattedTimeDelta: string | null;
  formattedDistanceDelta: string | null;
  formattedDeltaSummary: string | null;
}

export function computeCandidateDelta(
  candidate: RoutingCandidate,
  fastestCandidate?: RoutingCandidate | null,
): RouteCandidateDelta | null {
  if (!fastestCandidate || candidate.route_id === fastestCandidate.route_id) {
    return null;
  }
  const timeDeltaSeconds = candidate.duration_seconds - fastestCandidate.duration_seconds;
  const distanceDeltaMeters = candidate.distance_meters - fastestCandidate.distance_meters;
  const timeDeltaMinutes = Math.round(timeDeltaSeconds / 60);

  const formattedTimeDelta = timeDeltaSeconds > 0
    ? `+${Math.max(1, Math.ceil(timeDeltaSeconds / 60))} menit`
    : timeDeltaSeconds < 0
      ? `-${Math.max(1, Math.ceil(Math.abs(timeDeltaSeconds) / 60))} menit`
      : "Waktu sama";

  const formattedDistanceDelta = distanceDeltaMeters > 0
    ? `+${formatRouteDistance(distanceDeltaMeters)}`
    : distanceDeltaMeters < 0
      ? `-${formatRouteDistance(Math.abs(distanceDeltaMeters))}`
      : "Jarak sama";

  const parts: string[] = [];
  if (timeDeltaSeconds !== 0) parts.push(formattedTimeDelta);
  if (distanceDeltaMeters !== 0) parts.push(formattedDistanceDelta);
  const formattedDeltaSummary = parts.length > 0
    ? `${parts.join(" · ")} dibanding rute tercepat`
    : null;

  return {
    timeDeltaSeconds,
    timeDeltaMinutes,
    distanceDeltaMeters,
    formattedTimeDelta,
    formattedDistanceDelta,
    formattedDeltaSummary,
  };
}

export function deduplicateCandidates(candidates: RoutingCandidate[]): RoutingCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const coords = candidate.geometry.coordinates;
    const midCoord = coords[Math.floor(coords.length / 2)];
    const key = `${Math.round(candidate.distance_meters / 20)}:${Math.round(candidate.duration_seconds / 20)}:${midCoord?.[0].toFixed(3)}:${midCoord?.[1].toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

const LABEL_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, -20],
  [0, 20],
  [-18, -12],
  [18, 12],
];

export function getRouteLabelOffset(index: number, count: number): [number, number] {
  if (count <= 1) return [0, 0];
  const offset = LABEL_OFFSETS[index % LABEL_OFFSETS.length];
  return [offset[0], offset[1]];
}

