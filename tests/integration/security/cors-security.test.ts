import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security/options";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";

const API_ORIGIN = "https://api.getra.example";
const WEB_ORIGIN = "https://web.getra.example";
const EVIL_ORIGIN = "https://web.getra.example.evil.test";
const TEST_REQUEST_ID = "847d78d5-af47-4b82-a0cd-aeb5e0298fe7";

async function handleFixture(request: NextRequest) {
  const requestId = getRequestId(request);
  return withApiLogger(request, requestId, async () =>
    createSuccessResponse(requestId, { status: "TEST_OK" }),
  );
}

function actualRequest(origin?: string): NextRequest {
  return new NextRequest(`${API_ORIGIN}/api/health`, {
    headers: {
      ...(origin === undefined ? {} : { Origin: origin }),
      "X-Request-ID": TEST_REQUEST_ID,
    },
  });
}

function preflightRequest(
  method: string,
  headers: string,
  origin = WEB_ORIGIN,
): NextRequest {
  return new NextRequest(`${API_ORIGIN}/api/auth/login`, {
    method: "OPTIONS",
    headers: {
      "Access-Control-Request-Headers": headers,
      "Access-Control-Request-Method": method,
      Origin: origin,
      "X-Request-ID": TEST_REQUEST_ID,
    },
  });
}

describe("API wrapper CORS and security integration", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("APP_BASE_URL", API_ORIGIN);
    vi.stubEnv("FRONTEND_ALLOWED_ORIGINS", WEB_ORIGIN);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an exact allowlisted origin plus the complete API security policy", async () => {
    const response = await handleFixture(actualRequest(WEB_ORIGIN));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: { status: "TEST_OK" },
      request_id: TEST_REQUEST_ID,
      success: true,
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(response.headers.get("Vary")).toBe("Origin");
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(false);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'",
    );
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
  });

  it("rejects an origin lookalike with a safe envelope and no CORS grant", async () => {
    const response = await handleFixture(actualRequest(EVIL_ORIGIN));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "CORS_ORIGIN_DENIED",
        message: "Request origin is not allowed",
        retryable: false,
      },
      request_id: TEST_REQUEST_ID,
      success: false,
    });
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(false);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
    expect(JSON.stringify(body)).not.toContain(EVIL_ORIGIN);
  });

  it("keeps server-to-server requests origin-neutral", async () => {
    const response = await handleFixture(actualRequest());

    expect(response.status).toBe(200);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(false);
  });

  it("returns a strict, credential-free 204 for a valid endpoint preflight", async () => {
    const options = createOptionsHandler("/api/auth/login");
    const response = await options(
      preflightRequest("POST", "Content-Type, X-Request-ID"),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "content-type, x-request-id",
    );
    expect(response.headers.get("Access-Control-Max-Age")).toBe("600");
    expect(response.headers.get("Vary")).toBe("Origin");
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(false);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
  });

  it.each([
    { label: "unknown method", method: "DELETE", headers: "content-type" },
    { label: "unknown header", method: "POST", headers: "x-service-role-key" },
  ])("returns a safe 403 for $label preflight", async ({ method, headers }) => {
    const options = createOptionsHandler("/api/auth/login");
    const response = await options(preflightRequest(method, headers));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "CORS_PREFLIGHT_DENIED",
        message: "CORS preflight request is not allowed",
        retryable: false,
      },
      request_id: TEST_REQUEST_ID,
      success: false,
    });
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(false);
    expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
  });
});
