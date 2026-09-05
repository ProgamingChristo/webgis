import "server-only";

import { CachedRoutingProvider } from "@/src/features/routing/cached-routing.provider";
import type { RoutingProvider } from "@/src/features/routing/routing.types";
import { ValhallaRoutingProvider } from "@/src/features/routing/valhalla-routing.provider";
import type { NavigationFailureCode } from "@/src/features/routing/routing.types";
import {
  createTimeoutFetch,
  HttpTimeoutError,
  type FetchImplementation,
} from "@/src/lib/http/timeout-fetch";

export * from "@/src/features/routing/routing.types";
export * from "@/src/features/routing/route-umkm-analysis.service";

let provider: RoutingProvider | undefined;

export function getRoutingProvider(): RoutingProvider {
  if (provider) return provider;
  const { baseUrl, timeout, ttl } = getRoutingConfiguration();
  provider = new CachedRoutingProvider(
    new ValhallaRoutingProvider(baseUrl, globalThis.fetch, timeout),
    ttl,
  );
  return provider;
}

export function getRoutingConfiguration() {
  const providerName = (process.env.ROUTING_PROVIDER ?? "valhalla").trim().toLowerCase();
  if (providerName !== "valhalla") {
    throw new Error(`Unsupported routing provider: ${providerName}`);
  }
  const baseUrl = process.env.ROUTING_BASE_URL?.trim() || "http://127.0.0.1:8002";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error("ROUTING_BASE_URL is invalid");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("ROUTING_BASE_URL must use http or https");
  }
  const timeout = parsePositiveInteger(process.env.ROUTING_TIMEOUT_MS, 12_000);
  const ttl = parsePositiveInteger(process.env.ROUTING_CACHE_TTL_MS, 300_000);
  return {
    baseUrl: parsedUrl.toString().replace(/\/$/, ""),
    explicitBaseUrl: Boolean(process.env.ROUTING_BASE_URL?.trim()),
    providerName,
    timeout,
    ttl,
  };
}

export async function checkRoutingProviderHealth(
  fetchImplementation: FetchImplementation = globalThis.fetch,
) {
  let explicitBaseUrl = false;
  try {
    const config = getRoutingConfiguration();
    explicitBaseUrl = config.explicitBaseUrl;
    const fetchWithTimeout = createTimeoutFetch(
      Math.min(config.timeout, 5_000),
      fetchImplementation,
    );
    const response = await fetchWithTimeout(`${config.baseUrl}/status`, {
      headers: { accept: "application/json", "user-agent": "GETRA/0.1 routing-health" },
    });
    if (!response.ok) {
      return healthFailure("ROUTING_UPSTREAM_ERROR", config.explicitBaseUrl);
    }
    return {
      provider: "valhalla" as const,
      status: "READY" as const,
      configured: config.explicitBaseUrl,
      reachable: true,
      reason_code: null,
    };
  } catch (error) {
    return healthFailure(routingFailureCodeFromError(error), explicitBaseUrl);
  }
}

export function routingFailureCodeFromError(
  error: unknown,
  requestSignal?: AbortSignal,
): NavigationFailureCode {
  if (requestSignal?.aborted) return "ROUTING_REQUEST_ABORTED";
  if (error instanceof HttpTimeoutError) return "ROUTING_TIMEOUT";
  if (error instanceof Error) {
    if (
      error.message.includes("ROUTING_BASE_URL") ||
      error.message.includes("Unsupported routing provider") ||
      error.message.includes("Invalid routing configuration")
    ) return "ROUTING_PROVIDER_UNCONFIGURED";
    if (error.message.includes("VALHALLA_INVALID_SHAPE")) {
      return "ROUTING_PROVIDER_INVALID_RESPONSE";
    }
  }
  return "ROUTING_PROVIDER_UNREACHABLE";
}

function healthFailure(reasonCode: NavigationFailureCode, configured: boolean) {
  return {
    provider: "valhalla" as const,
    status: "UNAVAILABLE" as const,
    configured,
    reachable: false,
    reason_code: reasonCode,
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("Invalid routing configuration");
  return parsed;
}
