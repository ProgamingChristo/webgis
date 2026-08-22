import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/src/lib/errors";
import { RepositoryError } from "@/src/repositories/errors";

const repositoryToApplicationCode: Record<
  RepositoryError["code"],
  ApplicationErrorCode
> = {
  CONFLICT: "CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
};

export class ServiceError extends ApplicationError {
  constructor(code: ApplicationErrorCode, retryable = false) {
    super(code, undefined, retryable);
    this.name = "ServiceError";
  }
}

export function mapRepositoryError(error: unknown): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof RepositoryError) {
    const code = repositoryToApplicationCode[error.code];
    return new ServiceError(code, code === "DATABASE_ERROR");
  }

  return new ServiceError("INTERNAL_ERROR");
}
