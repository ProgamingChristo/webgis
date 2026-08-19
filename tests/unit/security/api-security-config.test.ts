import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseApiSecurityConfig } from "@/src/lib/api-security/config";
import type { ApplicationError } from "@/src/lib/errors";

function expectConfigurationFailure(input: Parameters<typeof parseApiSecurityConfig>[0]) {
  try {
    parseApiSecurityConfig(input);
  } catch (error) {
    expect(error).toMatchObject({ code: "INTERNAL_ERROR" });
    return error as ApplicationError;
  }

  throw new Error("TEST expected API security configuration to fail");
}

describe("API security configuration", () => {
  it("uses bounded, deny-by-default development settings", () => {
    expect(parseApiSecurityConfig({})).toEqual({
      allowedOrigins: [],
      appBaseUrl: "http://localhost:3000",
      appEnv: "development",
      maxJsonBodyBytes: 65_536,
      rateLimits: {
        api: { limit: 1000, windowMs: 60_000 },
        auth_general: { limit: 1000, windowMs: 60_000 },
        auth_register: { limit: 100, windowMs: 60_000 },
        auth_login: { limit: 100, windowMs: 60_000 },
        mutation: { limit: 20, windowMs: 60_000 },
        spatial: { limit: 30, windowMs: 60_000 },
      },
      supabaseRequestTimeoutMs: 10_000,
      trustProxy: false,
    });
  });

  it.each(["staging", "production"] as const)(
    "accepts an explicit HTTPS %s configuration",
    (appEnv) => {
      const config = parseApiSecurityConfig({
        API_MAX_JSON_BODY_BYTES: "32768",
        APP_BASE_URL: "https://api.getra.example",
        APP_ENV: appEnv,
        FRONTEND_ALLOWED_ORIGINS:
          " https://web.getra.example,https://admin.getra.example,https://web.getra.example ",
        RATE_LIMIT_API_MAX_REQUESTS: "101",
        RATE_LIMIT_AUTH_REGISTER_MAX_REQUESTS: "7",
        RATE_LIMIT_AUTH_LOGIN_MAX_REQUESTS: "7",
        RATE_LIMIT_AUTH_GENERAL_MAX_REQUESTS: "7",
        RATE_LIMIT_MUTATION_MAX_REQUESTS: "23",
        RATE_LIMIT_SPATIAL_MAX_REQUESTS: "31",
        RATE_LIMIT_WINDOW_MS: "45000",
        SUPABASE_REQUEST_TIMEOUT_MS: "12000",
        TRUST_PROXY: "true",
      });

      expect(config).toEqual({
        allowedOrigins: [
          "https://web.getra.example",
          "https://admin.getra.example",
        ],
        appBaseUrl: "https://api.getra.example",
        appEnv,
        maxJsonBodyBytes: 32_768,
        rateLimits: {
          api: { limit: 101, windowMs: 45_000 },
          auth_general: { limit: 7, windowMs: 45_000 },
          auth_register: { limit: 7, windowMs: 45_000 },
          auth_login: { limit: 7, windowMs: 45_000 },
          mutation: { limit: 23, windowMs: 45_000 },
          spatial: { limit: 31, windowMs: 45_000 },
        },
        supabaseRequestTimeoutMs: 12_000,
        trustProxy: true,
      });
    },
  );

  it.each([
    { label: "wildcard", value: "*" },
    { label: "opaque null origin", value: "null" },
    { label: "embedded credentials", value: "https://user:secret@web.getra.example" },
    { label: "path", value: "https://web.getra.example/app" },
    { label: "query", value: "https://web.getra.example?mode=test" },
    { label: "fragment", value: "https://web.getra.example#fragment" },
    { label: "trailing slash ambiguity", value: "https://web.getra.example/" },
    { label: "CRLF injection", value: "https://web.getra.example\r\nX-Test: injected" },
    { label: "non-HTTP scheme", value: "file://web.getra.example" },
  ])("rejects a $label in the frontend origin allowlist", ({ value }) => {
    expectConfigurationFailure({ FRONTEND_ALLOWED_ORIGINS: value });
  });

  it.each(["staging", "production"] as const)(
    "requires HTTPS for %s APP_BASE_URL",
    (appEnv) => {
      expectConfigurationFailure({
        APP_BASE_URL: "http://api.getra.example",
        APP_ENV: appEnv,
      });
    },
  );

  it.each([
    { key: "API_MAX_JSON_BODY_BYTES", value: "1023" },
    { key: "API_MAX_JSON_BODY_BYTES", value: "1048577" },
    { key: "RATE_LIMIT_WINDOW_MS", value: "999" },
    { key: "RATE_LIMIT_WINDOW_MS", value: "3600001" },
    { key: "RATE_LIMIT_AUTH_MAX_REQUESTS", value: "0" },
    { key: "RATE_LIMIT_API_MAX_REQUESTS", value: "100001" },
    { key: "RATE_LIMIT_MUTATION_MAX_REQUESTS", value: "not-a-number" },
    { key: "RATE_LIMIT_SPATIAL_MAX_REQUESTS", value: "1.5" },
    { key: "SUPABASE_REQUEST_TIMEOUT_MS", value: "999" },
    { key: "SUPABASE_REQUEST_TIMEOUT_MS", value: "60001" },
    { key: "TRUST_PROXY", value: "yes" },
  ] as const)("rejects invalid $key=$value", ({ key, value }) => {
    expectConfigurationFailure({ [key]: value });
  });
});
