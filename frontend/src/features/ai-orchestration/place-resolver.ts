import type { TransportNodeDto } from "@/src/types/canonical-api";
import type { PaginatedEnvelope } from "@/src/types/canonical-api";
import { getraApiGet } from "@/src/lib/api/client";
import type { Coordinate } from "@/src/types/spatial";
import { mapidLayerService } from "@/src/services/mapid-layer.service";
import type { Merchant } from "@/types/getra";
import {
  classifyEntityQuery,
  entityRetrievalTerms,
  normalizeEntityText,
  resolveEntityCandidates,
} from "@/types/entity-resolution";

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

export const CANONICAL_LANDMARKS_RESOLVER: Record<string, { label: string; latitude: number; longitude: number }> = {
  "bundaran hi": { label: "Bundaran HI", latitude: -6.1950, longitude: 106.8231 },
  "bundaran hotel indonesia": { label: "Bundaran Hotel Indonesia", latitude: -6.1950, longitude: 106.8231 },
  "monas": { label: "Monumen Nasional (Monas)", latitude: -6.1754, longitude: 106.8272 },
  "monumen nasional": { label: "Monumen Nasional (Monas)", latitude: -6.1754, longitude: 106.8272 },
  "sarinah": { label: "Sarinah", latitude: -6.1873, longitude: 106.8239 },
  "gbk": { label: "Gelora Bung Karno (GBK)", latitude: -6.2186, longitude: 106.8016 },
  "gelora bung karno": { label: "Gelora Bung Karno (GBK)", latitude: -6.2186, longitude: 106.8016 },
  "kota tua": { label: "Kota Tua Jakarta", latitude: -6.1349, longitude: 106.8133 },
  "blok m": { label: "Blok M", latitude: -6.2444, longitude: 106.7972 },
  "dukuh atas": { label: "Dukuh Atas", latitude: -6.2008, longitude: 106.8222 },
  "lapangan banteng": { label: "Lapangan Banteng", latitude: -6.1706, longitude: 106.8351 },
  "grand indonesia": { label: "Grand Indonesia", latitude: -6.1956, longitude: 106.8208 },
  "plaza indonesia": { label: "Plaza Indonesia", latitude: -6.1931, longitude: 106.8226 },
};

export async function resolveGetraPlace(
  query: string,
  transportNodes: TransportNodeDto[],
): Promise<PlaceResolution> {
  const normalized = normalizePlaceText(query);
  if (normalized.length < 2) return { status: "NOT_FOUND" };

  const canonical = CANONICAL_LANDMARKS_RESOLVER[normalized];
  if (canonical) {
    return {
      status: "RESOLVED",
      place: {
        id: `canonical-${normalized.replace(/\s+/g, "-")}`,
        label: canonical.label,
        coordinate: { latitude: canonical.latitude, longitude: canonical.longitude },
      },
    };
  }

  const queryKind = classifyEntityQuery(query);
  if (queryKind === "DISCOVERY") return { status: "NOT_FOUND" };
  const localTransport = resolveEntityCandidates(
    query,
    transportNodes.filter((node) => node.geometry?.type === "Point"),
    (node) => node.name,
  );
  if (localTransport.status === "AMBIGUOUS") {
    const exact = localTransport.candidates.find((c) => normalizeEntityText(c.label) === normalized);
    if (exact) {
      const node = exact.value;
      const [longitude, latitude] = node.geometry!.coordinates;
      return {
        status: "RESOLVED",
        place: {
          id: node.id,
          label: node.name,
          coordinate: { latitude, longitude },
        },
      };
    }
    return { status: "AMBIGUOUS", candidates: localTransport.candidates.map((item) => item.label) };
  }
  if (localTransport.status === "RESOLVED" && (queryKind === "PLACE" || localTransport.candidate.score >= 0.96)) {
    const node = localTransport.candidate.value;
    const [longitude, latitude] = node.geometry!.coordinates;
    return {
      status: "RESOLVED",
      place: {
        id: node.id,
        label: node.name,
        coordinate: { latitude, longitude },
      },
    };
  }

  let remoteTransport: PaginatedEnvelope<TransportNodeDto> = {
    items: [],
  };
  try {
    remoteTransport = await getraApiGet<PaginatedEnvelope<TransportNodeDto>>(
      "/api/v1/transport/nodes",
      { query: { q: query, limit: 5, page: 1 } },
    );
  } catch {
    // Continue to canonical merchants and bounded place resolution. A temporary
    // transport-index failure must not make every address search fail.
  }
  const remoteResolution = resolveEntityCandidates(
    query,
    remoteTransport.items.filter((node) => node.geometry?.type === "Point"),
    (node) => node.name,
  );
  if (remoteResolution.status === "AMBIGUOUS") {
    return { status: "AMBIGUOUS", candidates: remoteResolution.candidates.map((item) => item.label) };
  }
  if (remoteResolution.status === "RESOLVED" && (queryKind === "PLACE" || remoteResolution.candidate.score >= 0.96)) {
    const node = remoteResolution.candidate.value;
    const [longitude, latitude] = node.geometry!.coordinates;
    return {
      status: "RESOLVED",
      place: {
        id: node.id,
        label: node.name,
        coordinate: { latitude, longitude },
      },
    };
  }

  const layers: Array<{ merchants: Merchant[] }> = [];
  try {
    layers.push(await mapidLayerService.searchCanonicalMerchants(query, { limit: 12 }));
  } catch {
    // General place resolution remains useful when merchant search is
    // temporarily unavailable.
  }
  if (layers.every((layer) => layer.merchants.length === 0)) {
    for (const term of entityRetrievalTerms(query).slice(0, 2)) {
      try {
        layers.push(await mapidLayerService.searchCanonicalMerchants(term, { limit: 12 }));
      } catch {
        // Try the remaining bounded terms, then fall through to place lookup.
      }
    }
  }
  const candidates = [...new Map(layers.flatMap((layer) => layer.merchants).map((merchant) => [merchant.id, merchant])).values()];
  const merchantResolution = resolveEntityCandidates(query, candidates, (merchant) => merchant.name);
  if (merchantResolution.status === "AMBIGUOUS") {
    return { status: "AMBIGUOUS", candidates: merchantResolution.candidates.map((item) => item.label) };
  }
  if (merchantResolution.status === "RESOLVED") {
    const top = merchantResolution.candidate.value;
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

  if (localTransport.status === "RESOLVED" || remoteResolution.status === "RESOLVED") {
    const node = localTransport.status === "RESOLVED"
      ? localTransport.candidate.value
      : remoteResolution.status === "RESOLVED"
        ? remoteResolution.candidate.value
        : null;
    if (!node) return { status: "NOT_FOUND" };
    const [longitude, latitude] = node.geometry!.coordinates;
    return { status: "RESOLVED", place: { id: node.id, label: node.name, coordinate: { latitude, longitude } } };
  }

  if (candidates.length === 0 || merchantResolution.status === "NOT_FOUND") {
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
  return { status: "NOT_FOUND" };
}

export function normalizePlaceText(value: string): string {
  return normalizeEntityText(value);
}
