import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkLimit: vi.fn(),
  getServerSupabaseClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/rate-limit", () => ({
  rateLimiter: { checkLimit: mocks.checkLimit },
}));
vi.mock("@/src/lib/supabase/server", () => ({
  getRequestSupabaseClient: vi.fn(),
  getServerSupabaseClient: mocks.getServerSupabaseClient,
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as register } from "@/app/api/auth/register/route";
import { RateLimitExceededError } from "@/src/lib/errors";

const TEST_USER_ID = "70000000-0000-4000-8000-000000000001";

function jsonRequest(path: string, body: unknown, headers: HeadersInit = {}) {
  return new NextRequest(`http://localhost${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    method: "POST",
  });
}

describe("auth route public hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkLimit.mockResolvedValue(undefined);
  });

  it("requires a valid bearer token before acknowledging logout", async () => {
    const response = await logout(
      new NextRequest("http://localhost/api/auth/logout", { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mocks.getServerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.checkLimit).not.toHaveBeenCalled();
  });

  it("acknowledges authenticated stateless logout without an admin call", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mocks.getServerSupabaseClient.mockReturnValue({
      auth: { getUser },
    } as unknown as SupabaseClient);

    const response = await logout(
      new NextRequest("http://localhost/api/auth/logout", {
        headers: { Authorization: "Bearer TEST-LOGOUT-TOKEN" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.token_disposition).toBe("client_discard_required");
    expect(mocks.checkLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      `${TEST_USER_ID}:mutation:auth:logout`,
    );
    expect(JSON.stringify(body)).not.toContain("TEST-LOGOUT-TOKEN");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects a missing JSON media type before calling Supabase", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
      method: "POST",
    });
    const response = await login(request);

    expect(response.status).toBe(400);
    expect(mocks.getServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects unexpected registration fields before calling Supabase", async () => {
    const response = await register(
      jsonRequest("/api/auth/register", {
        display_name: "TEST USER",
        email: "test@example.com",
        password: "PasswordDevelopment123!",
        role: "COMMUTER",
        service_role_key: "TEST-MUST-NOT-LEAK",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(body)).not.toContain("TEST-MUST-NOT-LEAK");
    expect(mocks.getServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("rejects an oversized auth body before calling Supabase", async () => {
    const request = jsonRequest(
      "/api/auth/login",
      { email: "test@example.com", password: "x" },
      { "content-length": "9000" },
    );
    const response = await login(request);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error.code).toBe("REQUEST_TOO_LARGE");
    expect(mocks.getServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns a safe 429 before authentication/database work", async () => {
    mocks.checkLimit.mockRejectedValueOnce(new RateLimitExceededError(9));
    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "test@example.com",
        password: "PasswordDevelopment123!",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("9");
    expect(body.error).toEqual({
      code: "RATE_LIMIT_EXCEEDED",
      details: {
        source: "GETRA_RATE_LIMIT",
      },
      message: "Too many requests. Please try again later",
      retryable: true,
    });
    expect(mocks.getServerSupabaseClient).not.toHaveBeenCalled();
  });
});
