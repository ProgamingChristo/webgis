import "server-only";

import type {
  NavigationRouteRequest,
  NavigationRouteResult,
  RoutingProvider,
} from "@/src/features/routing/routing.types";

interface CacheEntry {
  expiresAt: number;
  value: NavigationRouteResult;
}

export class CachedRoutingProvider implements RoutingProvider {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly provider: RoutingProvider,
    private readonly ttlMs = 300_000,
    private readonly maximumEntries = 250,
  ) {}

  async route(input: NavigationRouteRequest, signal?: AbortSignal) {
    const key = cacheKey(input);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return structuredClone(cached.value);
    if (cached) this.cache.delete(key);

    const value = await this.provider.route(input, signal);
    if (value.route_status === "ROUTABLE") {
      if (this.cache.size >= this.maximumEntries) {
        this.cache.delete(this.cache.keys().next().value!);
      }
      this.cache.set(key, { expiresAt: Date.now() + this.ttlMs, value });
    }
    return structuredClone(value);
  }
}

function cacheKey(input: NavigationRouteRequest) {
  const coordinate = (value: number) => value.toFixed(5);
  return [
    input.mode,
    input.preference ?? "FASTEST",
    input.includeAlternatives ? "alternatives" : "primary",
    coordinate(input.origin.latitude),
    coordinate(input.origin.longitude),
    coordinate(input.destination.latitude),
    coordinate(input.destination.longitude),
  ].join(":");
}
