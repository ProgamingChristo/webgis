import { ExternalProviderError } from "@/src/integrations/core";
import { MAPID_PROVIDER } from "@/src/integrations/mapid/mapid.types";

export const MAPID_ERROR_CODES = [
  "MAPID_CONFIGURATION_ERROR",
  "MAPID_UNAUTHORIZED",
  "MAPID_FORBIDDEN",
  "MAPID_RATE_LIMITED",
  "MAPID_TIMEOUT",
  "MAPID_NETWORK_ERROR",
  "MAPID_INVALID_RESPONSE",
  "MAPID_UPSTREAM_ERROR",
] as const;

export type MapidErrorCode = (typeof MAPID_ERROR_CODES)[number];

const safeMessages: Record<MapidErrorCode, string> = {
  MAPID_CONFIGURATION_ERROR: "MAPID integration is not configured",
  MAPID_FORBIDDEN: "MAPID request is forbidden",
  MAPID_INVALID_RESPONSE: "MAPID response is invalid",
  MAPID_NETWORK_ERROR: "MAPID network request failed",
  MAPID_RATE_LIMITED: "MAPID request was rate limited",
  MAPID_TIMEOUT: "MAPID request timed out",
  MAPID_UNAUTHORIZED: "MAPID authentication failed",
  MAPID_UPSTREAM_ERROR: "MAPID upstream request failed",
};

const defaultRetryableCodes = new Set<MapidErrorCode>([
  "MAPID_NETWORK_ERROR",
  "MAPID_RATE_LIMITED",
  "MAPID_TIMEOUT",
]);

export class MapidError extends ExternalProviderError<MapidErrorCode> {
  constructor(
    code: MapidErrorCode,
    options: { retryable?: boolean; upstreamStatus?: number } = {},
  ) {
    super(
      MAPID_PROVIDER,
      code,
      safeMessages[code],
      options.retryable ?? defaultRetryableCodes.has(code),
      options.upstreamStatus,
    );
    this.name = "MapidError";
  }
}

const transientStatuses = new Set([500, 502, 503, 504]);

export function mapMapidHttpError(status: number): MapidError {
  if (status === 401) {
    return new MapidError("MAPID_UNAUTHORIZED", { upstreamStatus: status });
  }

  if (status === 403) {
    return new MapidError("MAPID_FORBIDDEN", { upstreamStatus: status });
  }

  if (status === 429) {
    return new MapidError("MAPID_RATE_LIMITED", {
      retryable: true,
      upstreamStatus: status,
    });
  }

  return new MapidError("MAPID_UPSTREAM_ERROR", {
    retryable: transientStatuses.has(status),
    upstreamStatus: status,
  });
}
