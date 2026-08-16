import { describe, expect, it } from "vitest";

import { assertRepositoryPagination } from "@/src/repositories/contracts";

describe("repository pagination assertion", () => {
  it("picks a bounded Phase 3 pagination value without leaking query fields", () => {
    const query = {
      page: 3,
      limit: 20,
      offset: 40,
      role: "ADMIN",
      sort: "created_at",
    };

    const pagination = assertRepositoryPagination(query);

    expect(pagination).toEqual({ page: 3, limit: 20, offset: 40 });
    expect(pagination).not.toBe(query);
  });

  it.each([
    { page: 0, limit: 20, offset: 0 },
    { page: 1.5, limit: 20, offset: 0 },
    { page: 1, limit: 0, offset: 0 },
    { page: 1, limit: 101, offset: 0 },
    { page: 1, limit: 20.5, offset: 0 },
    { page: 1, limit: 20, offset: -1 },
    { page: 1, limit: 20, offset: 0.5 },
  ])("rejects invalid repository pagination %#", (pagination) => {
    expect(() => assertRepositoryPagination(pagination)).toThrow(
      new TypeError("Invalid repository pagination"),
    );
  });
});
