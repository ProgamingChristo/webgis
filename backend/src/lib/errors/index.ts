export const applicationErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "AUTH_EMAIL_ALREADY_EXISTS",
  "AUTH_EMAIL_CONFIRMATION_REQUIRED",
  "DATABASE_ERROR",
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
  "CORS_ORIGIN_DENIED",
  "CORS_PREFLIGHT_DENIED",
  "RATE_LIMIT_EXCEEDED",
  "CONTRIBUTION_RATE_LIMITED",
  "CONTRIBUTION_DUPLICATE",
  "INVALID_OBSERVATION_TIME",
  "INVALID_TARGET_LOCATION",
  "REQUEST_TOO_LARGE",
  "SPATIAL_INVALID_CONFIGURATION",
  "SPATIAL_INVALID_COORDINATE",
  "SPATIAL_INVALID_DISTANCE",
  "SPATIAL_INVALID_GEOMETRY",
  "SPATIAL_INVALID_BBOX",
  "SPATIAL_INVALID_RADIUS",
  "SPATIAL_ENTITY_NOT_FOUND",
  "SPATIAL_QUERY_FAILED",
  "SPATIAL_NETWORK_NOT_READY",
  "SPATIAL_REQUEST_TOO_LARGE",
  "ROUTING_GRAPH_NOT_AVAILABLE",
  "AI_PROVIDER_CONFIGURATION",
  "AI_PROVIDER_UPSTREAM",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_PROVIDER_INVALID_RESPONSE",
  "AI_PROVIDER_TIMEOUT",
] as const;

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];

const publicMessages: Record<ApplicationErrorCode, string> = {
  CONFLICT: "Resource conflict",
  AUTH_EMAIL_ALREADY_EXISTS: "Email is already registered",
  AUTH_EMAIL_CONFIRMATION_REQUIRED: "Email verification is still enabled",
  AI_PROVIDER_CONFIGURATION: "Provider AI belum tersedia. Periksa konfigurasi server.",
  AI_PROVIDER_INVALID_RESPONSE: "Provider AI mengembalikan respons yang tidak valid.",
  AI_PROVIDER_TIMEOUT: "Provider AI tidak merespons tepat waktu. Silakan coba lagi.",
  AI_PROVIDER_UNAVAILABLE: "Provider AI sementara tidak tersedia. Silakan coba lagi nanti.",
  AI_PROVIDER_UPSTREAM: "Provider AI menolak permintaan. Silakan coba lagi nanti.",
  CORS_ORIGIN_DENIED: "Request origin is not allowed",
  CORS_PREFLIGHT_DENIED: "CORS preflight request is not allowed",
  CONTRIBUTION_DUPLICATE: "A similar report was submitted recently",
  CONTRIBUTION_RATE_LIMITED: "Contribution report limit reached",
  DATABASE_ERROR: "Database operation failed",
  DATABASE_UNAVAILABLE: "Database connection failed",
  FORBIDDEN: "Forbidden",
  INVALID_OBSERVATION_TIME: "Contribution observation time is invalid",
  INVALID_TARGET_LOCATION: "Contribution target location is invalid",
  INTERNAL_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",
  REQUEST_TOO_LARGE: "Request body is too large",
  ROUTING_GRAPH_NOT_AVAILABLE: "Routing graph is not available",
  SPATIAL_ENTITY_NOT_FOUND: "Spatial entity not found",
  SPATIAL_INVALID_BBOX: "Bounding box is invalid",
  SPATIAL_INVALID_CONFIGURATION: "Spatial engine configuration is invalid",
  SPATIAL_INVALID_COORDINATE: "Coordinate is invalid",
  SPATIAL_INVALID_DISTANCE: "Distance is invalid",
  SPATIAL_INVALID_GEOMETRY: "Geometry is invalid",
  SPATIAL_INVALID_RADIUS: "Radius is invalid",
  SPATIAL_NETWORK_NOT_READY: "Spatial network is not ready",
  SPATIAL_QUERY_FAILED: "Spatial query failed",
  SPATIAL_REQUEST_TOO_LARGE: "Spatial request body is too large",
  UNAUTHORIZED: "Unauthorized",
  VALIDATION_ERROR: "Request validation failed",
};

const httpStatuses: Record<ApplicationErrorCode, number> = {
  CONFLICT: 409,
  AUTH_EMAIL_ALREADY_EXISTS: 409,
  AUTH_EMAIL_CONFIRMATION_REQUIRED: 409,
  AI_PROVIDER_CONFIGURATION: 503,
  AI_PROVIDER_INVALID_RESPONSE: 502,
  AI_PROVIDER_TIMEOUT: 504,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_PROVIDER_UPSTREAM: 502,
  CORS_ORIGIN_DENIED: 403,
  CORS_PREFLIGHT_DENIED: 403,
  CONTRIBUTION_DUPLICATE: 409,
  CONTRIBUTION_RATE_LIMITED: 429,
  DATABASE_ERROR: 500,
  DATABASE_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_OBSERVATION_TIME: 400,
  INVALID_TARGET_LOCATION: 400,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  RATE_LIMIT_EXCEEDED: 429,
  REQUEST_TOO_LARGE: 413,
  ROUTING_GRAPH_NOT_AVAILABLE: 503,
  SPATIAL_ENTITY_NOT_FOUND: 404,
  SPATIAL_INVALID_BBOX: 400,
  SPATIAL_INVALID_CONFIGURATION: 500,
  SPATIAL_INVALID_COORDINATE: 400,
  SPATIAL_INVALID_DISTANCE: 400,
  SPATIAL_INVALID_GEOMETRY: 400,
  SPATIAL_INVALID_RADIUS: 400,
  SPATIAL_NETWORK_NOT_READY: 503,
  SPATIAL_QUERY_FAILED: 500,
  SPATIAL_REQUEST_TOO_LARGE: 413,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
};

export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    message = publicMessages[code],
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export type AiProviderErrorCategory =
  | "configuration"
  | "invalid_response"
  | "timeout"
  | "unavailable"
  | "upstream";

export interface AiProviderErrorOptions {
  category: AiProviderErrorCategory;
  provider: "sub2api";
  upstreamCode?: string;
  upstreamMessage?: string;
  upstreamStatus?: number;
}

const providerErrorCodes: Record<AiProviderErrorCategory, ApplicationErrorCode> = {
  configuration: "AI_PROVIDER_CONFIGURATION",
  invalid_response: "AI_PROVIDER_INVALID_RESPONSE",
  timeout: "AI_PROVIDER_TIMEOUT",
  unavailable: "AI_PROVIDER_UNAVAILABLE",
  upstream: "AI_PROVIDER_UPSTREAM",
};

export class AiProviderError extends ApplicationError {
  readonly category: AiProviderErrorCategory;
  readonly provider: "sub2api";
  readonly upstreamCode?: string;
  readonly upstreamMessage?: string;
  readonly upstreamStatus?: number;

  constructor(options: AiProviderErrorOptions) {
    const code = providerErrorCodes[options.category];
    super(
      code,
      publicMessages[code],
      options.category === "timeout" || options.category === "unavailable",
    );
    this.name = "AiProviderError";
    this.category = options.category;
    this.provider = options.provider;
    this.upstreamCode = options.upstreamCode;
    this.upstreamMessage = options.upstreamMessage;
    this.upstreamStatus = options.upstreamStatus;
  }
}

export class DatabaseUnavailableError extends ApplicationError {
  constructor() {
    super("DATABASE_UNAVAILABLE", publicMessages.DATABASE_UNAVAILABLE, true);
    this.name = "DatabaseUnavailableError";
  }
}

export type RateLimitSource = "GETRA_RATE_LIMIT" | "SUPABASE_AUTH";

export class RateLimitExceededError extends ApplicationError {
  constructor(
    readonly retryAfterSeconds: number,
    readonly source: RateLimitSource = "GETRA_RATE_LIMIT"
  ) {
    super("RATE_LIMIT_EXCEEDED", publicMessages.RATE_LIMIT_EXCEEDED, true);
    this.name = "RateLimitExceededError";
  }
}

export function getHttpStatusForError(code: ApplicationErrorCode): number {
  return httpStatuses[code];
}

export function getPublicErrorMessage(code: ApplicationErrorCode): string {
  return publicMessages[code];
}

export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError("INTERNAL_ERROR");
}
