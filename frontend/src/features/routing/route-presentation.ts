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

function distanceMeters(a: [number, number], b: [number, number]): number {
  const avgLat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const dx = (b[0] - a[0]) * Math.cos(avgLat) * 111320;
  const dy = (b[1] - a[1]) * 110540;
  return Math.hypot(dx, dy);
}

export function computeCooperativeAnchors(candidates: RoutingCandidate[]): Map<string, [number, number]> {
  const anchors = new Map<string, [number, number]>();
  const placedAnchors: Array<[number, number]> = [];

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const candidate = candidates[idx];
    const coords = candidate.geometry?.coordinates;
    if (!coords || coords.length < 2) {
      if (coords && coords.length > 0) {
        const pt = coords[0] as [number, number];
        anchors.set(candidate.route_id, pt);
        placedAnchors.push(pt);
      }
      continue;
    }

    const lengths: number[] = [];
    for (let i = 0; i < coords.length - 1; i += 1) {
      lengths.push(distanceMeters(coords[i] as [number, number], coords[i + 1] as [number, number]));
    }
    const total = lengths.reduce((s, l) => s + l, 0);

    const getCoordAtFraction = (fraction: number): [number, number] => {
      const target = total * Math.max(0, Math.min(1, fraction));
      let traversed = 0;
      for (let i = 0; i < lengths.length; i += 1) {
        if (traversed + lengths[i] >= target) {
          const ratio = lengths[i] === 0 ? 0 : (target - traversed) / lengths[i];
          const s = coords[i] as [number, number];
          const e = coords[i + 1] as [number, number];
          return [s[0] + (e[0] - s[0]) * ratio, s[1] + (e[1] - s[1]) * ratio];
        }
        traversed += lengths[i];
      }
      return (coords.at(-1) as [number, number]) ?? (coords[0] as [number, number]);
    };

    if (idx === 0) {
      const fraction = candidates.length >= 2 ? 0.32 : 0.50;
      const anchor = getCoordAtFraction(fraction);
      anchors.set(candidate.route_id, anchor);
      placedAnchors.push(anchor);
      continue;
    }

    const primaryCoords = candidates[0].geometry?.coordinates;

    let maxDistToPrimary = 0;
    if (primaryCoords && primaryCoords.length >= 2) {
      const pStep = Math.max(1, Math.floor(primaryCoords.length / 40));
      for (let i = 0; i < lengths.length; i += 1) {
        const frac = (i + 1) / lengths.length;
        if (frac >= 0.20 && frac <= 0.80) {
          const pt = coords[i + 1] as [number, number];
          let minDist = Infinity;
          for (let j = 0; j < primaryCoords.length; j += pStep) {
            const d = distanceMeters(pt, primaryCoords[j] as [number, number]);
            if (d < minDist) minDist = d;
          }
          if (minDist > maxDistToPrimary) maxDistToPrimary = minDist;
        }
      }
    }
    const isDetour = candidate.route_category !== "UMKM_AREA" && maxDistToPrimary >= 400;

    const minSeparation = 3200;
    let bestPoint: [number, number] | null = null;
    let bestScore = -Infinity;
    let fallbackPoint: [number, number] | null = null;
    let maxMinDistToPlaced = -Infinity;

    let traversed = 0;
    for (let i = 0; i < lengths.length; i += 1) {
      traversed += lengths[i];
      const frac = traversed / total;
      if (frac >= 0.20 && frac <= 0.80) {
        const pt = coords[i + 1] as [number, number];

        let minDistToPlaced = Infinity;
        for (const placed of placedAnchors) {
          const d = distanceMeters(pt, placed);
          if (d < minDistToPlaced) minDistToPlaced = d;
        }

        if (minDistToPlaced > maxMinDistToPlaced) {
          maxMinDistToPlaced = minDistToPlaced;
          fallbackPoint = pt;
        }

        if (minDistToPlaced >= minSeparation) {
          let score = 0;
          if (isDetour && primaryCoords && primaryCoords.length >= 2) {
            let minDist = Infinity;
            const pStep = Math.max(1, Math.floor(primaryCoords.length / 40));
            for (let j = 0; j < primaryCoords.length; j += pStep) {
              const d = distanceMeters(pt, primaryCoords[j] as [number, number]);
              if (d < minDist) minDist = d;
            }
            score = 10000 + minDist;
          } else {
            const distToTargetFrac = Math.abs(frac - 0.68);
            score = 10000 - distToTargetFrac * 15000;
          }

          if (score > bestScore) {
            bestScore = score;
            bestPoint = pt;
          }
        }
      }
    }

    const chosen = bestPoint ?? fallbackPoint ?? getCoordAtFraction(0.50);
    anchors.set(candidate.route_id, chosen);
    placedAnchors.push(chosen);
  }

  return anchors;
}

export function getRouteLabelAnchor(
  candidate: RoutingCandidate,
  index: number,
  allCandidatesOrCount: RoutingCandidate[] | number,
): [number, number] | null {
  const coordinates = candidate.geometry?.coordinates;
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length < 2) return coordinates[0] ?? null;

  const allCandidates = Array.isArray(allCandidatesOrCount) ? allCandidatesOrCount : null;
  const count = allCandidates ? allCandidates.length : typeof allCandidatesOrCount === "number" ? allCandidatesOrCount : 1;

  if (allCandidates && allCandidates.length > 1) {
    const cooperativeMap = computeCooperativeAnchors(allCandidates);
    const cooperativeAnchor = cooperativeMap.get(candidate.route_id);
    if (cooperativeAnchor) return cooperativeAnchor;
  }

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
  [-18, -14],
  [18, 14],
];

export function getRouteLabelOffset(index: number, count: number): [number, number] {
  if (count <= 1) return [0, 0];
  const offset = LABEL_OFFSETS[index % LABEL_OFFSETS.length];
  return [offset[0], offset[1]];
}

