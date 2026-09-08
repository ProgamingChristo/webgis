export const repositoryErrorCodes = [
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "FORBIDDEN",
  "CONTRIBUTION_RATE_LIMITED",
  "CONTRIBUTION_DUPLICATE",
  "INVALID_OBSERVATION_TIME",
  "INVALID_TARGET_LOCATION",
  "DATABASE_ERROR",
] as const;

export type RepositoryErrorCode = (typeof repositoryErrorCodes)[number];

const repositoryErrorMessages: Record<RepositoryErrorCode, string> = {
  CONFLICT: "The repository operation conflicts with existing data",
  CONTRIBUTION_DUPLICATE: "The contribution duplicates a recent user report",
  CONTRIBUTION_RATE_LIMITED: "The contribution report limit was exceeded",
  DATABASE_ERROR: "The repository operation failed",
  FORBIDDEN: "The repository operation is not permitted",
  INVALID_OBSERVATION_TIME: "The contribution observation time is invalid",
  INVALID_TARGET_LOCATION: "The contribution target location is invalid",
  NOT_FOUND: "The requested repository record was not found",
  VALIDATION_ERROR: "The repository operation contains invalid data",
};

export class RepositoryError extends Error {
  constructor(
    readonly code: RepositoryErrorCode,
    readonly operation: string,
    options: { cause?: unknown } = {},
  ) {
    super(repositoryErrorMessages[code], options);
    this.name = "RepositoryError";
  }
}

type DatabaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

function readDatabaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const code = (error as DatabaseErrorLike).code;
  return typeof code === "string" ? code : undefined;
}

function readDatabaseErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const message = (error as DatabaseErrorLike).message;
  return typeof message === "string" ? message : undefined;
}

export function mapDatabaseError(
  error: unknown,
  operation: string,
): RepositoryError {
  if (error instanceof RepositoryError) {
    return error;
  }

  const code = readDatabaseErrorCode(error);
  const message = readDatabaseErrorMessage(error) ?? "";

  if (message.includes("GETRA_CONTRIBUTION_RATE_LIMITED")) {
    return new RepositoryError("CONTRIBUTION_RATE_LIMITED", operation, {
      cause: error,
    });
  }

  if (message.includes("GETRA_CONTRIBUTION_DUPLICATE")) {
    return new RepositoryError("CONTRIBUTION_DUPLICATE", operation, {
      cause: error,
    });
  }

  if (message.includes("GETRA_INVALID_OBSERVATION_TIME")) {
    return new RepositoryError("INVALID_OBSERVATION_TIME", operation, {
      cause: error,
    });
  }

  if (message.includes("GETRA_INVALID_TARGET_LOCATION")) {
    return new RepositoryError("INVALID_TARGET_LOCATION", operation, {
      cause: error,
    });
  }

  if (
    message.includes("Contribution not found") ||
    message.includes("Community post not found")
  ) {
    return new RepositoryError("NOT_FOUND", operation, { cause: error });
  }

  if (message.includes("GETRA_SELF_REVIEW_FORBIDDEN")) {
    return new RepositoryError("FORBIDDEN", operation, { cause: error });
  }

  if (code === "PGRST116") {
    return new RepositoryError("NOT_FOUND", operation, { cause: error });
  }

  if (code === "23505" || code === "409") {
    return new RepositoryError("CONFLICT", operation, { cause: error });
  }

  if (
    code === "22023" ||
    code === "22P02" ||
    code === "23502" ||
    code === "23503" ||
    code === "23514" ||
    code === "PGRST100"
  ) {
    return new RepositoryError("VALIDATION_ERROR", operation, { cause: error });
  }

  if (code === "42501" || code === "PGRST301") {
    return new RepositoryError("FORBIDDEN", operation, { cause: error });
  }

  return new RepositoryError("DATABASE_ERROR", operation, { cause: error });
}
