import { describe, expect, it } from "vitest";

import {
  applyCorsHeaders,
  createPreflightResponse,
  evaluateActualCors,
  evaluatePreflightCors,
} from "@/src/lib/api-security/cors";
import {
  API_STATIC_SECURITY_HEADERS,
  applyProductionHsts,
  applyStaticSecurityHeaders,
} from "@/src/lib/api-security/security-headers";

const API_ORIGIN = "https://api.getra.example";
const WEB_ORIGIN = "https://web.getra.example";
const ALLOWED_ORIGINS = [WEB_ORIGIN] as const;

function request(
  origin?: string,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${API_ORIGIN}/api/profile`, {
    headers: {
      ...(origin === undefined ? {} : { Origin: origin }),
      ...headers,
    },
  });
}

describe("actual-request CORS", () => {
  it("allows server-to-server requests without an Origin header", () => {
    expect(evaluateActualCors(request(), ALLOWED_ORIGINS)).toEqual({
      allowed: true,
    });
  });

  it("allows an exact configured frontend origin", () => {
    expect(evaluateActualCors(request(WEB_ORIGIN), ALLOWED_ORIGINS)).toEqual({
      allowed: true,
      origin: WEB_ORIGIN,
    });
  });

  it("allows the API's exact same origin without adding it to the frontend list", () => {
    expect(evaluateActualCors(request(API_ORIGIN), ALLOWED_ORIGINS)).toEqual({
      allowed: true,
      origin: API_ORIGIN,
    });
  });

  it.each([
    "https://evil.example",
    "null",
    "https://web.getra.example.evil.example",
    "https://web.getra.example:444",
    "http://web.getra.example",
  ])("rejects non-exact origin %s", (origin) => {
    expect(evaluateActualCors(request(origin), ALLOWED_ORIGINS)).toEqual({
      allowed: false,
    });
  });

  it("emits an exact origin and Vary without wildcard or credential support", () => {
    const headers = new Headers({ Vary: "Accept-Encoding" });
    applyCorsHeaders(headers, { allowed: true, origin: WEB_ORIGIN });
    applyCorsHeaders(headers, { allowed: true, origin: WEB_ORIGIN });

    expect(headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(headers.get("Access-Control-Allow-Origin")).not.toBe("*");
    expect(headers.has("Access-Control-Allow-Credentials")).toBe(false);
    expect(headers.get("Access-Control-Expose-Headers")).toBe(
      "X-Request-ID, Retry-After",
    );
    expect(headers.get("Vary")).toBe("Accept-Encoding, Origin");
  });
});

describe("CORS preflight", () => {
  const allowedMethods = ["GET", "PATCH"] as const;
  const allowedHeaders = [
    "authorization",
    "content-type",
    "x-request-id",
  ] as const;

  function preflight(
    method: string,
    requestedHeaders = "authorization, content-type, x-request-id",
    origin = WEB_ORIGIN,
  ): Request {
    return request(origin, {
      "Access-Control-Request-Headers": requestedHeaders,
      "Access-Control-Request-Method": method,
    });
  }

  it("accepts an exact method and case-insensitive allowed header set", () => {
    expect(
      evaluatePreflightCors(
        preflight("patch", "Authorization, Content-Type, X-Request-ID"),
        ALLOWED_ORIGINS,
        allowedMethods,
        allowedHeaders,
      ),
    ).toEqual({ allowed: true, origin: WEB_ORIGIN });
  });

  it.each([
    { label: "unknown method", request: preflight("DELETE") },
    { label: "unknown header", request: preflight("PATCH", "x-admin-secret") },
    { label: "malformed header", request: preflight("PATCH", "authorization, bad header") },
    { label: "unknown origin", request: preflight("PATCH", "authorization", "https://evil.example") },
    { label: "missing method", request: request(WEB_ORIGIN) },
  ])("rejects $label", ({ request: candidate }) => {
    expect(
      evaluatePreflightCors(
        candidate,
        ALLOWED_ORIGINS,
        allowedMethods,
        allowedHeaders,
      ),
    ).toEqual({ allowed: false });
  });

  it("builds a credential-free 204 preflight response", () => {
    const response = createPreflightResponse(
      preflight("PATCH"),
      ALLOWED_ORIGINS,
      allowedMethods,
      allowedHeaders,
    );

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(WEB_ORIGIN);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, PATCH",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "authorization, content-type, x-request-id",
    );
    expect(response.headers.get("Access-Control-Max-Age")).toBe("600");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("throws a sanitized application error for a denied preflight", () => {
    expect(() =>
      createPreflightResponse(
        preflight("DELETE"),
        ALLOWED_ORIGINS,
        allowedMethods,
        allowedHeaders,
      ),
    ).toThrow(expect.objectContaining({ code: "CORS_PREFLIGHT_DENIED" }));
  });
});

describe("API security headers", () => {
  it("applies the complete static API header policy", () => {
    const headers = new Headers();
    applyStaticSecurityHeaders(headers);

    expect(API_STATIC_SECURITY_HEADERS).toHaveLength(7);
    for (const expected of API_STATIC_SECURITY_HEADERS) {
      expect(headers.get(expected.key)).toBe(expected.value);
    }
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("enables HSTS only for an HTTPS production base URL", () => {
    const production = new Headers();
    applyProductionHsts(
      production,
      "production",
      "https://api.getra.example",
    );
    expect(production.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );

    for (const [environment, baseUrl] of [
      ["development", "https://api.getra.example"],
      ["staging", "https://api.getra.example"],
      ["production", "http://localhost:3000"],
    ] as const) {
      const headers = new Headers();
      applyProductionHsts(headers, environment, baseUrl);
      expect(headers.has("Strict-Transport-Security")).toBe(false);
    }
  });
});
