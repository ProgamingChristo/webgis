import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildMapidRequest,
  MapidClient,
  type MapidHttpTransport,
  type MapidRetryDelay,
} from "@/src/integrations/mapid/mapid.client";
import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import type {
  MapidAuthenticationStrategy,
  MapidProviderConfig,
} from "@/src/integrations/mapid/mapid.types";

const TEST_BASE_URL = "https://mapid.test.invalid/provider-root";
const TEST_CREDENTIAL = "TEST_CREDENTIAL";

function createConfig(
  overrides: Partial<MapidProviderConfig> = {},
): MapidProviderConfig {
  return {
    apiKey: TEST_CREDENTIAL,
    baseUrl: TEST_BASE_URL,
    retry: { baseDelayMs: 10, maxAttempts: 3 },
    timeoutMs: 100,
    ...overrides,
  };
}

function createTestAuthentication(): MapidAuthenticationStrategy {
  return {
    apply: vi.fn((headers, apiKey) => {
      // This fixture-only header is not an assumption about MAPID authentication.
      headers.set("x-getra-test-auth", `TEST ${apiKey}`);
    }),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

async function captureMapidError(operation: Promise<unknown>): Promise<MapidError> {
  let thrown: unknown;

  try {
    await operation;
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(MapidError);
  return thrown as MapidError;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("MAPID request builder", () => {
  it("builds a same-origin GET request and delegates authentication to the injected strategy", () => {
    const authentication = createTestAuthentication();
    const built = buildMapidRequest(
      createConfig(),
      {
        path: "/records",
        query: {
          category: "TEST FIXTURE",
          tag: ["one", "two"],
        },
      },
      authentication,
    );
    const url = new URL(built.url);

    expect(built.method).toBe("GET");
    expect(url.origin).toBe("https://mapid.test.invalid");
    expect(url.pathname).toBe("/provider-root/records");
    expect(url.searchParams.get("category")).toBe("TEST FIXTURE");
    expect(url.searchParams.getAll("tag")).toEqual(["one", "two"]);
    expect(built.headers.get("Accept")).toBe("application/json");
    expect(built.headers.get("x-getra-test-auth")).toBe(
      `TEST ${TEST_CREDENTIAL}`,
    );
    expect(authentication.apply).toHaveBeenCalledWith(
      expect.any(Headers),
      TEST_CREDENTIAL,
    );
  });

  it("maps an authentication strategy failure to a sanitized configuration error", () => {
    const authentication: MapidAuthenticationStrategy = {
      apply: vi.fn(() => {
        throw new Error("TEST_CREDENTIAL_MUST_NOT_LEAK");
      }),
    };

    expect(() =>
      buildMapidRequest(
        createConfig(),
        { path: "/records" },
        authentication,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "MAPID_CONFIGURATION_ERROR",
        message: "MAPID integration is not configured",
      }),
    );
  });

  it("builds a POST request with a JSON body for MAPID Mission endpoints", () => {
    const authentication = createTestAuthentication();
    const built = buildMapidRequest(
      createConfig(),
      {
        body: {
          feature: {
            coordinates: [[[106.7, -6.2], [106.8, -6.2], [106.8, -6.1], [106.7, -6.2]]],
            type: "Polygon",
          },
          offset: 0,
        },
        method: "POST",
        path: "/web/competition/menugo",
      },
      authentication,
    );

    expect(built.method).toBe("POST");
    expect(new URL(built.url).pathname).toBe("/provider-root/web/competition/menugo");
    expect(built.headers.get("Content-Type")).toBe("application/json");
    expect(built.body).toBe(
      JSON.stringify({
        feature: {
          coordinates: [[[106.7, -6.2], [106.8, -6.2], [106.8, -6.1], [106.7, -6.2]]],
          type: "Polygon",
        },
        offset: 0,
      }),
    );
  });
});

describe("MapidClient", () => {
  it("aborts a timed-out request and returns a sanitized timeout error", async () => {
    vi.useFakeTimers();
    const transport: MapidHttpTransport = vi.fn((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
    );
    const client = new MapidClient(
      createConfig({
        retry: { baseDelayMs: 10, maxAttempts: 1 },
        timeoutMs: 25,
      }),
      createTestAuthentication(),
      transport,
      vi.fn(),
    );
    const operation = captureMapidError(client.request({ path: "/timeout" }));

    await vi.advanceTimersByTimeAsync(25);
    const error = await operation;

    expect(error).toMatchObject({
      code: "MAPID_TIMEOUT",
      message: "MAPID request timed out",
      retryable: true,
    });
    expect(transport).toHaveBeenCalledOnce();
  });

  it("retries network failures with bounded exponential delays and stops at max attempts", async () => {
    const transport: MapidHttpTransport = vi
      .fn()
      .mockRejectedValue(new TypeError("TEST internal network detail"));
    const delay: MapidRetryDelay = vi.fn().mockResolvedValue(undefined);
    const client = new MapidClient(
      createConfig(),
      createTestAuthentication(),
      transport,
      delay,
    );

    const error = await captureMapidError(
      client.request({ path: "/network-failure" }),
    );

    expect(error).toMatchObject({
      code: "MAPID_NETWORK_ERROR",
      message: "MAPID network request failed",
      retryable: true,
    });
    expect(error.message).not.toContain("internal network detail");
    expect(transport).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenNthCalledWith(1, 10);
    expect(delay).toHaveBeenNthCalledWith(2, 20);
  });

  it.each([
    [400, "MAPID_UPSTREAM_ERROR"],
    [401, "MAPID_UNAUTHORIZED"],
    [403, "MAPID_FORBIDDEN"],
  ] as const)(
    "does not retry HTTP %i responses",
    async (status, expectedCode) => {
      const transport: MapidHttpTransport = vi
        .fn()
        .mockResolvedValue(new Response(null, { status }));
      const delay: MapidRetryDelay = vi.fn().mockResolvedValue(undefined);
      const client = new MapidClient(
        createConfig(),
        createTestAuthentication(),
        transport,
        delay,
      );

      const error = await captureMapidError(
        client.request({ path: "/non-retryable" }),
      );

      expect(error).toMatchObject({
        code: expectedCode,
        retryable: false,
        upstreamStatus: status,
      });
      expect(transport).toHaveBeenCalledOnce();
      expect(delay).not.toHaveBeenCalled();
    },
  );

  it.each([429, 500, 502, 503, 504])(
    "retries transient HTTP %i and returns the later successful response",
    async (status) => {
      const responseBody = { fixture: true, status };
      const transport: MapidHttpTransport = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(jsonResponse(responseBody));
      const delay: MapidRetryDelay = vi.fn().mockResolvedValue(undefined);
      const client = new MapidClient(
        createConfig({ retry: { baseDelayMs: 7, maxAttempts: 2 } }),
        createTestAuthentication(),
        transport,
        delay,
      );

      await expect(
        client.request({ path: "/transient-response" }),
      ).resolves.toEqual(responseBody);
      expect(transport).toHaveBeenCalledTimes(2);
      expect(delay).toHaveBeenCalledOnce();
      expect(delay).toHaveBeenCalledWith(7);
    },
  );

  it("maps invalid JSON to a non-retryable invalid-response error", async () => {
    const transport: MapidHttpTransport = vi
      .fn()
      .mockResolvedValue(
        new Response("TEST fixture is not JSON", {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    const delay: MapidRetryDelay = vi.fn().mockResolvedValue(undefined);
    const client = new MapidClient(
      createConfig(),
      createTestAuthentication(),
      transport,
      delay,
    );

    const error = await captureMapidError(
      client.request({ path: "/invalid-json" }),
    );

    expect(error).toMatchObject({
      code: "MAPID_INVALID_RESPONSE",
      message: "MAPID response is invalid",
      retryable: false,
    });
    expect(transport).toHaveBeenCalledOnce();
    expect(delay).not.toHaveBeenCalled();
  });
});
