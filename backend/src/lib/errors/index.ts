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
] as const;

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];

const publicMessages: Record<ApplicationErrorCode, string> = {
  CONFLICT: "Resource conflict",
  AUTH_EMAIL_ALREADY_EXISTS: "Email is already registered",
  AUTH_EMAIL_CONFIRMATION_REQUIRED: "Email verification is still enabled",
  CORS_ORIGIN_DENIED: "Request origin is not allowed",
  CORS_PREFLIGHT_DENIED: "CORS preflight request is not allowed",
  DATABASE_ERROR: "Database operation failed",
  DATABASE_UNAVAILABLE: "Database connection failed",
  FORBIDDEN: "Forbidden",
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
  CORS_ORIGIN_DENIED: 403,
  CORS_PREFLIGHT_DENIED: 403,
  DATABASE_ERROR: 500,
  DATABASE_UNAVAILABLE: 503,
  FORBIDDEN: 403,
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
