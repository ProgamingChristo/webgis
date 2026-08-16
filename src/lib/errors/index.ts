export const applicationErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "DATABASE_ERROR",
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];

const publicMessages: Record<ApplicationErrorCode, string> = {
  CONFLICT: "Resource conflict",
  DATABASE_ERROR: "Database operation failed",
  DATABASE_UNAVAILABLE: "Database connection failed",
  FORBIDDEN: "Forbidden",
  INTERNAL_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Unauthorized",
  VALIDATION_ERROR: "Request validation failed",
};

const httpStatuses: Record<ApplicationErrorCode, number> = {
  CONFLICT: 409,
  DATABASE_ERROR: 500,
  DATABASE_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
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
