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

const MERCHANT_FALLBACK_STOP_WORDS = new Set([
  "tempat",
  "lokasi",
  "tujuan",
  "alamat",
  "ke",
  "menuju",
  "di",
  "yang",
]);

export async function resolveGetraPlace(
  query: string,
  transportNodes: TransportNodeDto[],
): Promise<PlaceResolution> {
  const cleanedQuery = cleanPlaceQuery(query);
  const normalized = normalizePlaceText(cleanedQuery);
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
    { query: { q: cleanedQuery, limit: 5, page: 1 } },
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

  const candidates = await searchMerchantCandidates(cleanedQuery, normalized);
  const scoredMerchants = candidates
    .map((merchant) => ({
      merchant,
      score: placeMatchScore(normalized, normalizePlaceText(merchant.name)),
    }))
    .filter((candidate) => candidate.score >= 0.5)
    .sort((left, right) =>
      right.score - left.score || left.merchant.name.localeCompare(right.merchant.name, "id"),
    );

  if (scoredMerchants.length > 0) {
    const top = scoredMerchants[0];
    const similarlyNamed = scoredMerchants.filter((candidate) =>
      candidate.score >= top.score - 0.03,
    );
    if (similarlyNamed.length > 1 && top.score < 0.98) {
      return {
        status: "AMBIGUOUS",
        candidates: similarlyNamed.slice(0, 3).map((candidate) => candidate.merchant.name),
      };
    }
    return {
      status: "RESOLVED",
      place: {
        id: top.merchant.id,
        label: top.merchant.name,
        coordinate: { latitude: top.merchant.latitude, longitude: top.merchant.longitude },
        merchant: top.merchant,
      },
    };
  }

  const geocoded = await getraApiGet<{
    data: { candidates: Array<{ id: string; label: string; latitude: number; longitude: number }> };
  }>("/api/places/resolve", { query: { q: cleanedQuery } });
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

async function searchMerchantCandidates(
  query: string,
  normalizedQuery: string,
): Promise<Merchant[]> {
  const primary = await mapidLayerService.searchCanonicalMerchants(query, { limit: 6 });
  if (primary.merchants.length > 0) return primary.merchants;

  const fallbackQueries = [...new Set(
    normalizedQuery
      .split(" ")
      .filter((token) => token.length >= 3 && !MERCHANT_FALLBACK_STOP_WORDS.has(token))
      .reverse(),
  )].slice(0, 2);

  const byId = new Map<string, Merchant>();
  for (const fallbackQuery of fallbackQueries) {
    try {
      const layer = await mapidLayerService.searchCanonicalMerchants(fallbackQuery, { limit: 8 });
      for (const merchant of layer.merchants) byId.set(merchant.id, merchant);
    } catch {
      // A failed fallback token must not hide a later geocoding fallback.
    }
  }
  return [...byId.values()];
}

export function cleanPlaceQuery(value: string): string {
  let cleaned = value.trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(/^(?:ke|menuju)\s+/iu, "");
  cleaned = cleaned.replace(/^(?:tempat|lokasi|tujuan|alamat)\s+(?:bernama\s+)?/iu, "");
  cleaned = cleaned.replace(/\s+(?:ya|dong|tolong)$/iu, "");
  return cleaned.trim();
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
