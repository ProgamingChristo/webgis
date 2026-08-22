import { describe, expect, it } from "vitest";

import type { ApplicationErrorCode } from "@/src/lib/errors";
import {
  RepositoryError,
  type RepositoryErrorCode,
} from "@/src/repositories/errors";
import { mapRepositoryError, ServiceError } from "@/src/services/errors";

describe("service error mapping", () => {
  it.each<[RepositoryErrorCode, ApplicationErrorCode, boolean]>([
    ["NOT_FOUND", "NOT_FOUND", false],
    ["CONFLICT", "CONFLICT", false],
    ["VALIDATION_ERROR", "VALIDATION_ERROR", false],
    ["FORBIDDEN", "FORBIDDEN", false],
    ["DATABASE_ERROR", "DATABASE_ERROR", true],
  ])(
    "maps repository %s to application %s",
    (repositoryCode, expectedCode, retryable) => {
      const mapped = mapRepositoryError(
        new RepositoryError(repositoryCode, "fixtures.operation"),
      );

      expect(mapped).toBeInstanceOf(ServiceError);
      expect(mapped.code).toBe(expectedCode);
      expect(mapped.retryable).toBe(retryable);
    },
  );

  it("never promotes a repository cause message into the service message", () => {
    const internalDetail = "SQL select * from private.fixture";
    const repositoryError = new RepositoryError(
      "DATABASE_ERROR",
      "fixtures.read",
      { cause: new Error(internalDetail) },
    );

    const mapped = mapRepositoryError(repositoryError);

    expect(mapped.message).toBe("Database operation failed");
    expect(mapped.message).not.toContain(internalDetail);
  });

  it("maps unknown failures to a sanitized internal error", () => {
    const mapped = mapRepositoryError(
      new Error("fixture database hostname and stack detail"),
    );

    expect(mapped).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      retryable: false,
    });
  });

  it("does not wrap an error that is already a ServiceError", () => {
    const serviceError = new ServiceError("FORBIDDEN");

    expect(mapRepositoryError(serviceError)).toBe(serviceError);
  });
});
