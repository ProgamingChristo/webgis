import type { TransportNodeDto } from "@/src/types/canonical-api";
import type { PaginatedEnvelope } from "@/src/types/canonical-api";
import { getraApiGet } from "@/src/lib/api/client";
import type { Coordinate } from "@/src/types/spatial";
import { mapidLayerService } from "@/src/services/mapid-layer.service";
import type { Merchant } from "@/types/getra";

export interface ResolvedPlace {
  id: string;
  label: string;
  coordinate: Coordinate;
  merchant?: Merchant;
}

export type PlaceResolution =
  | { status: "RESOLVED"; place: ResolvedPlace }
  | { status: "AMBIGUOUS"; candidates: string[] }
  | { status: "NOT_FOUND" };

export async function resolveGetraPlace(
  query: string,
  transportNodes: TransportNodeDto[],
): Promise<PlaceResolution> {
  const normalized = normalizePlaceText(query);
  if (normalized.length < 2) return { status: "NOT_FOUND" };

  const transportMatches = transportNodes
    .filter((node) => node.geometry?.type === "Point")
    .map((node) => ({ node, score: placeMatchScore(normalized, normalizePlaceText(node.name)) }))
    .filter((candidate) => candidate.score >= 0.6)
    .sort((left, right) => right.score - left.score || left.node.name.localeCompare(right.node.name, "id"));
  const topTransport = transportMatches[0];
  if (topTransport) {
    const competing = transportMatches.filter((candidate) =>
      candidate.score >= topTransport.score - 0.03,
    );
    if (competing.length > 1) {
      return { status: "AMBIGUOUS", candidates: competing.slice(0, 3).map((item) => item.node.name) };
    }
    const [longitude, latitude] = topTransport.node.geometry!.coordinates;
    return {
      status: "RESOLVED",
      place: {
        id: topTransport.node.id,
        label: topTransport.node.name,
        coordinate: { latitude, longitude },
      },
    };
  }

  const remoteTransport = await getraApiGet<PaginatedEnvelope<TransportNodeDto>>(
    "/api/v1/transport/nodes",
    { query: { q: query, limit: 5, page: 1 } },
  );
  const remoteTransportMatches = remoteTransport.items
    .filter((node) => node.geometry?.type === "Point")
    .map((node) => ({ node, score: placeMatchScore(normalized, normalizePlaceText(node.name)) }))
    .filter((candidate) => candidate.score >= 0.6)
    .sort((left, right) => right.score - left.score || left.node.name.localeCompare(right.node.name, "id"));
  const remoteTop = remoteTransportMatches[0];
  if (remoteTop) {
    const competing = remoteTransportMatches.filter((candidate) => candidate.score >= remoteTop.score - 0.03);
    if (competing.length > 1) {
      return { status: "AMBIGUOUS", candidates: competing.slice(0, 3).map((item) => item.node.name) };
    }
    const [longitude, latitude] = remoteTop.node.geometry!.coordinates;
    return {
      status: "RESOLVED",
      place: {
        id: remoteTop.node.id,
        label: remoteTop.node.name,
        coordinate: { latitude, longitude },
      },
    };
  }

  const merchantLayer = await mapidLayerService.searchCanonicalMerchants(query, { limit: 4 });
  const candidates = merchantLayer.merchants;
  if (candidates.length === 0) {
    const geocoded = await getraApiGet<{
      data: { candidates: Array<{ id: string; label: string; latitude: number; longitude: number }> };
    }>("/api/places/resolve", { query: { q: query } });
    const placeCandidates = geocoded.data.candidates;
    if (placeCandidates.length === 0) return { status: "NOT_FOUND" };
    if (placeCandidates.length > 1) {
      return { status: "AMBIGUOUS", candidates: placeCandidates.slice(0, 3).map((place) => place.label) };
    }
    const place = placeCandidates[0];
    return {
      status: "RESOLVED",
      place: {
        id: place.id,
        label: place.label,
        coordinate: { latitude: place.latitude, longitude: place.longitude },
      },
    };
  }
  const top = candidates[0];
  const topScore = placeMatchScore(normalized, normalizePlaceText(top.name));
  const similarlyNamed = candidates.filter((merchant) =>
    placeMatchScore(normalized, normalizePlaceText(merchant.name)) >= topScore - 0.03,
  );
  if (similarlyNamed.length > 1 && topScore < 0.98) {
    return { status: "AMBIGUOUS", candidates: similarlyNamed.slice(0, 3).map((merchant) => merchant.name) };
  }
  return {
    status: "RESOLVED",
    place: {
      id: top.id,
      label: top.name,
      coordinate: { latitude: top.latitude, longitude: top.longitude },
      merchant: top,
    },
  };
}

export function normalizePlaceText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function placeMatchScore(query: string, candidate: string): number {
  if (query === candidate) return 1;
  if (candidate.startsWith(query) || candidate.includes(query)) return 0.9;
  const queryTokens = new Set(query.split(" "));
  const candidateTokens = new Set(candidate.split(" "));
  const shared = [...queryTokens].filter((token) => candidateTokens.has(token)).length;
  return shared / Math.max(queryTokens.size, candidateTokens.size, 1);
}
