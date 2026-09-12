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

export async function resolveGetraPlace(
  query: string,
  transportNodes: TransportNodeDto[],
): Promise<PlaceResolution> {
  const normalized = normalizePlaceText(query);
  if (normalized.length < 2) return { status: "NOT_FOUND" };

  const queryKind = classifyEntityQuery(query);
  if (queryKind === "DISCOVERY") return { status: "NOT_FOUND" };
  const localTransport = resolveEntityCandidates(
    query,
    transportNodes.filter((node) => node.geometry?.type === "Point"),
    (node) => node.name,
  );
  if (localTransport.status === "AMBIGUOUS") {
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

  const remoteTransport = await getraApiGet<PaginatedEnvelope<TransportNodeDto>>(
    "/api/v1/transport/nodes",
    { query: { q: query, limit: 5, page: 1 } },
  );
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

  const layers = [await mapidLayerService.searchCanonicalMerchants(query, { limit: 12 })];
  if (layers[0].merchants.length === 0) {
    for (const term of entityRetrievalTerms(query).slice(0, 2)) {
      layers.push(await mapidLayerService.searchCanonicalMerchants(term, { limit: 12 }));
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
