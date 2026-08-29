import "server-only";

import { MapidError, mapMapidHttpError } from "@/src/integrations/mapid/mapid.errors";
import { mapidRequestSchema } from "@/src/integrations/mapid/mapid.schema";
import type {
  MapidAuthenticationStrategy,
  MapidClientPort,
  MapidProviderConfig,
  MapidRawResponse,
  MapidRequest,
} from "@/src/integrations/mapid/mapid.types";

export type MapidHttpTransport = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

export type MapidRetryDelay = (milliseconds: number) => Promise<void>;

export interface BuiltMapidRequest {
  body?: string;
  headers: Headers;
  method: "GET" | "POST";
  url: string;
}

const defaultTransport: MapidHttpTransport = (input, init) =>
  fetch(input, init);

const defaultDelay: MapidRetryDelay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function buildMapidRequest(
  config: MapidProviderConfig,
  request: MapidRequest,
  authentication: MapidAuthenticationStrategy,
): BuiltMapidRequest {
  const parsed = mapidRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new MapidError("MAPID_CONFIGURATION_ERROR");
  }

  const url = new URL(`${config.baseUrl}${parsed.data.path}`);
  const configuredOrigin = new URL(config.baseUrl).origin;
  if (url.origin !== configuredOrigin) {
    throw new MapidError("MAPID_CONFIGURATION_ERROR");
  }

  for (const [key, value] of Object.entries(parsed.data.query ?? {})) {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => url.searchParams.append(key, item));
  }

  const headers = new Headers({ Accept: "application/json" });
  try {
    authentication.apply(headers, config.apiKey);
  } catch {
    throw new MapidError("MAPID_CONFIGURATION_ERROR");
  }

  let body: string | undefined;
  if (parsed.data.method === "POST") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(parsed.data.body ?? {});
  }

  return {
    body,
    headers,
    method: parsed.data.method,
    url: url.toString(),
  };
}

export class MapidClient implements MapidClientPort {
  constructor(
    private readonly config: MapidProviderConfig,
    private readonly authentication: MapidAuthenticationStrategy,
    private readonly transport: MapidHttpTransport = defaultTransport,
    private readonly delay: MapidRetryDelay = defaultDelay,
  ) {}

  async request(request: MapidRequest): Promise<MapidRawResponse> {
    const builtRequest = buildMapidRequest(
      this.config,
      request,
      this.authentication,
    );

    for (
      let attempt = 1;
      attempt <= this.config.retry.maxAttempts;
      attempt += 1
    ) {
      try {
        const response = await this.executeAttempt(builtRequest);

        if (!response.ok) {
          throw mapMapidHttpError(response.status);
        }

        try {
          return (await response.json()) as unknown;
        } catch {
          throw new MapidError("MAPID_INVALID_RESPONSE");
        }
      } catch (error) {
        const mappedError = error instanceof MapidError
          ? error
          : new MapidError("MAPID_NETWORK_ERROR");

        if (
          !mappedError.retryable ||
          attempt >= this.config.retry.maxAttempts
        ) {
          throw mappedError;
        }

        const retryDelay =
          this.config.retry.baseDelayMs * 2 ** (attempt - 1);
        await this.delay(retryDelay);
      }
    }

    throw new MapidError("MAPID_NETWORK_ERROR");
  }

  private async executeAttempt(
    request: BuiltMapidRequest,
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.config.timeoutMs);

    try {
      return await this.transport(request.url, {
        body: request.body,
        headers: request.headers,
        method: request.method,
        signal: controller.signal,
      });
    } catch {
      throw new MapidError(
        timedOut ? "MAPID_TIMEOUT" : "MAPID_NETWORK_ERROR",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
