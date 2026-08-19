import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";

import { AppEnvironment } from "@/src/lib/api-security/config";
import { RateLimitExceededError } from "@/src/lib/errors";
import {
  InMemoryRateLimiter,
  NoOpRateLimiter,
} from "@/src/lib/rate-limit";

const makeRequest = (headers: HeadersInit = {}): NextRequest =>
  new NextRequest("http://localhost/api/test", { headers });

const makeConfig = (
  overrides: Partial<{
    trustProxy: boolean;
    appEnv: AppEnvironment;
    auth_register: { limit: number; windowMs: number };
    auth_login: { limit: number; windowMs: number };
    auth_general: { limit: number; windowMs: number };
    api: { limit: number; windowMs: number };
    mutation: { limit: number; windowMs: number };
    spatial: { limit: number; windowMs: number };
  }> = {},
) => ({
  trustProxy: overrides.trustProxy ?? false,
  appEnv: overrides.appEnv ?? "production",
  rateLimits: {
    auth_register: overrides.auth_register ?? { limit: 2, windowMs: 2_500 },
    auth_login: overrides.auth_login ?? { limit: 2, windowMs: 2_500 },
    auth_general: overrides.auth_general ?? { limit: 2, windowMs: 2_500 },
    api: overrides.api ?? { limit: 2, windowMs: 2_500 },
    mutation: overrides.mutation ?? { limit: 2, windowMs: 2_500 },
    spatial: overrides.spatial ?? { limit: 2, windowMs: 2_500 },
  },
});

describe("InMemoryRateLimiter", () => {
  let now: number;

  beforeEach(() => {
    now = 1_000;
  });

  it("enforces a fixed window and returns a ceiling Retry-After", async () => {
    const limiter = new InMemoryRateLimiter({
      clock: () => now,
      config: makeConfig(),
    });
    const request = makeRequest();

    await limiter.checkLimit(request, "auth:login");
    await limiter.checkLimit(request, "auth:login");

    await expect(limiter.checkLimit(request, "auth:login")).rejects.toMatchObject({
      retryAfterSeconds: 3,
      code: "RATE_LIMIT_EXCEEDED",
      retryable: true,
    });

    now = 3_500;
    await expect(limiter.checkLimit(request, "auth:login")).resolves.toBeUndefined();
  });

  it.each([
    ["auth:login", "auth", 1],
    ["user-id:api:profile", "api", 2],
    ["user-id:mutation:profile", "mutation", 3],
    ["user-id:spatial:nearby", "spatial", 4],
  ] as const)(
    "selects the %s policy from the internal identifier",
    async (identifier, policy, allowedRequests) => {
      const limiter = new InMemoryRateLimiter({
        clock: () => now,
        config: makeConfig({
          auth_login: { limit: 1, windowMs: 60_000 },
          api: { limit: 2, windowMs: 60_000 },
          mutation: { limit: 3, windowMs: 60_000 },
          spatial: { limit: 4, windowMs: 60_000 },
        }),
      });
      const request = makeRequest();

      for (let requestNumber = 0; requestNumber < allowedRequests; requestNumber += 1) {
        await limiter.checkLimit(request, identifier);
      }

      await expect(limiter.checkLimit(request, identifier)).rejects.toBeInstanceOf(
        RateLimitExceededError,
      );
      expect(policy).toBeTruthy();
    },
  );

  it("uses a valid forwarded address only when proxy trust is explicit", async () => {
    const limiter = new InMemoryRateLimiter({
      clock: () => now,
      config: makeConfig({
        trustProxy: true,
        auth_login: { limit: 1, windowMs: 60_000 },
      }),
    });

    await limiter.checkLimit(
      makeRequest({ "x-forwarded-for": "198.51.100.10, 10.0.0.2" }),
      "auth:login",
    );
    await expect(
      limiter.checkLimit(
        makeRequest({ "x-forwarded-for": "198.51.100.11" }),
        "auth:login",
      ),
    ).resolves.toBeUndefined();
    await expect(
      limiter.checkLimit(
        makeRequest({ "x-forwarded-for": "198.51.100.10" }),
        "auth:login",
      ),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("does not trust spoofable forwarding headers by default", async () => {
    const limiter = new InMemoryRateLimiter({
      clock: () => now,
      config: makeConfig({ auth_register: { limit: 1, windowMs: 60_000 } }),
    });

    await limiter.checkLimit(
      makeRequest({ "x-forwarded-for": "198.51.100.10" }),
      "auth:register",
    );
    await expect(
      limiter.checkLimit(
        makeRequest({ "x-forwarded-for": "203.0.113.20" }),
        "auth:register",
      ),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("puts invalid trusted-proxy headers into the shared untrusted bucket", async () => {
    const limiter = new InMemoryRateLimiter({
      clock: () => now,
      config: makeConfig({
        trustProxy: true,
        auth_login: { limit: 1, windowMs: 60_000 },
      }),
    });

    await limiter.checkLimit(
      makeRequest({ "x-forwarded-for": "not-an-ip" }),
      "auth:login",
    );
    await expect(
      limiter.checkLimit(
        makeRequest({ "x-forwarded-for": "also-not-an-ip" }),
        "auth:login",
      ),
    ).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("keeps storage bounded and evicts the oldest live bucket", async () => {
    const limiter = new InMemoryRateLimiter({
      clock: () => now,
      config: makeConfig({ api: { limit: 10, windowMs: 60_000 } }),
      maxBuckets: 2,
    });
    const request = makeRequest();

    await limiter.checkLimit(request, "first:api:read");
    await limiter.checkLimit(request, "second:api:read");
    await limiter.checkLimit(request, "third:api:read");

    expect(limiter.bucketCount).toBe(2);
    await expect(
      limiter.checkLimit(request, "first:api:read"),
    ).resolves.toBeUndefined();
    expect(limiter.bucketCount).toBe(2);
  });

  it("cleans expired buckets before allocating a new one", async () => {
    const limiter = new InMemoryRateLimiter({
      clock: () => now,
      config: makeConfig({ api: { limit: 10, windowMs: 1_000 } }),
      maxBuckets: 2,
    });
    const request = makeRequest();

    await limiter.checkLimit(request, "first:api:read");
    await limiter.checkLimit(request, "second:api:read");
    now = 2_000;
    await limiter.checkLimit(request, "third:api:read");

    expect(limiter.bucketCount).toBe(1);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid maxBuckets %s",
    (maxBuckets) => {
      expect(
        () =>
          new InMemoryRateLimiter({
            config: makeConfig(),
            maxBuckets,
          }),
      ).toThrow("maxBuckets must be a positive safe integer");
    },
  );
});

describe("NoOpRateLimiter", () => {
  it("remains available for explicitly injected compatibility tests", async () => {
    const limiter = new NoOpRateLimiter();

    await expect(
      limiter.checkLimit(makeRequest(), "auth:login"),
    ).resolves.toBeUndefined();
  });
});
