import { describe, expect, it } from "vitest";

import {
  mapDatabaseError,
  RepositoryError,
  type RepositoryErrorCode,
} from "@/src/repositories/errors";

describe("repository database error mapping", () => {
  it.each<[string, RepositoryErrorCode]>([
    ["PGRST116", "NOT_FOUND"],
    ["23505", "CONFLICT"],
    ["409", "CONFLICT"],
    ["22023", "VALIDATION_ERROR"],
    ["22P02", "VALIDATION_ERROR"],
    ["23502", "VALIDATION_ERROR"],
    ["23503", "VALIDATION_ERROR"],
    ["23514", "VALIDATION_ERROR"],
    ["PGRST100", "VALIDATION_ERROR"],
    ["42501", "FORBIDDEN"],
    ["PGRST301", "FORBIDDEN"],
    ["XX000", "DATABASE_ERROR"],
  ])("maps database code %s to %s", (databaseCode, expectedCode) => {
    const mapped = mapDatabaseError(
      { code: databaseCode, message: "internal database detail" },
      "fixtures.read",
    );

    expect(mapped).toBeInstanceOf(RepositoryError);
    expect(mapped).toMatchObject({
      code: expectedCode,
      operation: "fixtures.read",
    });
  });

  it("uses a sanitized message while retaining the cause for internal handling", () => {
    const internalDetail = "duplicate key with private constraint detail";
    const cause = { code: "23505", message: internalDetail };

    const mapped = mapDatabaseError(cause, "fixtures.create");

    expect(mapped.message).toBe(
      "The repository operation conflicts with existing data",
    );
    expect(mapped.message).not.toContain(internalDetail);
    expect(mapped.cause).toBe(cause);
  });

  it.each([
    ["GETRA_CONTRIBUTION_RATE_LIMITED", "CONTRIBUTION_RATE_LIMITED"],
    ["GETRA_CONTRIBUTION_DUPLICATE", "CONTRIBUTION_DUPLICATE"],
    ["GETRA_INVALID_OBSERVATION_TIME_FUTURE", "INVALID_OBSERVATION_TIME"],
    ["GETRA_INVALID_OBSERVATION_TIME_TOO_OLD", "INVALID_OBSERVATION_TIME"],
    ["GETRA_INVALID_TARGET_LOCATION_SAME_AS_CANONICAL", "INVALID_TARGET_LOCATION"],
  ] as const)(
    "maps deterministic contribution failure %s to %s",
    (databaseMessage, expectedCode) => {
      const mapped = mapDatabaseError(
        { code: "P0001", message: databaseMessage },
        "community_contributions.create",
      );

      expect(mapped).toMatchObject({
        code: expectedCode,
        operation: "community_contributions.create",
      });
      expect(mapped.message).not.toContain(databaseMessage);
    },
  );

  it.each([null, "database failed", { message: "missing code" }])(
    "maps an unclassified value to a sanitized database error",
    (cause) => {
      const mapped = mapDatabaseError(cause, "fixtures.read");

      expect(mapped).toMatchObject({
        code: "DATABASE_ERROR",
        message: "The repository operation failed",
        operation: "fixtures.read",
      });
    },
  );

  it("does not wrap an error that is already a RepositoryError", () => {
    const repositoryError = new RepositoryError("FORBIDDEN", "fixtures.update");

    expect(mapDatabaseError(repositoryError, "ignored.operation")).toBe(
      repositoryError,
    );
  });
});
