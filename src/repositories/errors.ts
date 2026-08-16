export const repositoryErrorCodes = [
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "FORBIDDEN",
  "DATABASE_ERROR",
] as const;

export type RepositoryErrorCode = (typeof repositoryErrorCodes)[number];

const repositoryErrorMessages: Record<RepositoryErrorCode, string> = {
  CONFLICT: "The repository operation conflicts with existing data",
  DATABASE_ERROR: "The repository operation failed",
  FORBIDDEN: "The repository operation is not permitted",
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
};

function readDatabaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const code = (error as DatabaseErrorLike).code;
  return typeof code === "string" ? code : undefined;
}

export function mapDatabaseError(error: unknown, operation: string): RepositoryError {
  if (error instanceof RepositoryError) {
    return error;
  }

  const code = readDatabaseErrorCode(error);

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
