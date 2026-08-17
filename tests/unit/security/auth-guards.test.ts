import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/server", () => ({
  getRequestSupabaseClient: vi.fn(),
  getServerSupabaseClient: vi.fn(),
}));

import { createErrorResponse } from "@/src/lib/api-response";
import {
  requireAuthenticatedUser,
  requireRole,
} from "@/src/lib/auth";
import type { ApplicationError } from "@/src/lib/errors";
import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";
import type { UserRole } from "@/src/schemas/auth.schema";

const TEST_REQUEST_ID = "db991862-1c66-4ed0-a034-279fee4efba3";
const TEST_USER_ID = "70000000-0000-4000-8000-000000000001";
const TEST_TOKEN = "TEST-RAW-TOKEN-MUST-NOT-LEAK";

async function captureRejected<T>(operation: Promise<T>): Promise<ApplicationError> {
  try {
    await operation;
  } catch (error) {
    return error as ApplicationError;
  }
  throw new Error("TEST expected operation to reject");
}

function authenticatedRequest(
  authorization = `Bearer ${TEST_TOKEN}`,
): NextRequest {
  return new NextRequest("http://localhost/api/internal/test-guard", {
    headers: { Authorization: authorization },
  });
}

function configureAuthenticatedUser() {
  const getUser = vi.fn(async () => ({
    data: { user: { id: TEST_USER_ID } },
    error: null,
  }));
  vi.mocked(getServerSupabaseClient).mockReturnValue({
    auth: { getUser },
  } as unknown as SupabaseClient);
  return getUser;
}

function configureProfileRole(role: UserRole) {
  const builder = {
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: {
        avatar_url: null,
        created_at: "2026-08-16T00:00:00.000Z",
        display_name: "TEST SECURITY USER",
        id: TEST_USER_ID,
        role,
        updated_at: "2026-08-16T00:00:00.000Z",
      },
      error: null,
    })),
    select: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);

  const from = vi.fn().mockReturnValue(builder);
  vi.mocked(getRequestSupabaseClient).mockReturnValue({
    from,
  } as unknown as SupabaseClient);
  return { builder, from };
}

describe("authentication and role guard negative boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { label: "missing", authorization: undefined },
    { label: "basic scheme", authorization: `Basic ${TEST_TOKEN}` },
    { label: "bearer without separator", authorization: `Bearer${TEST_TOKEN}` },
  ])("rejects a $label bearer header before Supabase access", async ({ authorization }) => {
    const request = authorization
      ? authenticatedRequest(authorization)
      : new NextRequest("http://localhost/api/internal/test-guard");
    const error = await captureRejected(requireAuthenticatedUser(request));

    expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    expect(getServerSupabaseClient).not.toHaveBeenCalled();
    expect(getRequestSupabaseClient).not.toHaveBeenCalled();

    const response = createErrorResponse(TEST_REQUEST_ID, error);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        retryable: false,
      },
      request_id: TEST_REQUEST_ID,
      success: false,
    });
    expect(JSON.stringify(body)).not.toContain(TEST_TOKEN);
  });

  it("sanitizes an invalid raw bearer token in the public response", async () => {
    const getUser = vi.fn(async () => ({
      data: { user: null },
      error: new Error(`invalid token ${TEST_TOKEN}`),
    }));
    vi.mocked(getServerSupabaseClient).mockReturnValue({
      auth: { getUser },
    } as unknown as SupabaseClient);

    const error = await captureRejected(
      requireAuthenticatedUser(authenticatedRequest()),
    );
    const response = createErrorResponse(TEST_REQUEST_ID, error);
    const body = await response.json();

    expect(getUser).toHaveBeenCalledWith(TEST_TOKEN);
    expect(response.status).toBe(401);
    expect(body.error).toEqual({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
      retryable: false,
    });
    expect(JSON.stringify(body)).not.toContain(TEST_TOKEN);
    expect(JSON.stringify(body)).not.toContain("invalid token");
  });

  it.each<UserRole>(["COMMUTER", "UMKM", "COMMUNITY"])(
    "denies %s access to an ADMIN guard through the request-scoped client",
    async (role) => {
      const authorization = `Bearer ${TEST_TOKEN}`;
      configureAuthenticatedUser();
      const { builder, from } = configureProfileRole(role);

      const error = await captureRejected(
        requireRole(authenticatedRequest(authorization), "ADMIN"),
      );

      expect(error).toMatchObject({ code: "FORBIDDEN" });
      expect(getRequestSupabaseClient).toHaveBeenCalledWith(authorization);
      expect(from).toHaveBeenCalledWith("profiles");
      expect(builder.eq).toHaveBeenCalledWith("id", TEST_USER_ID);

      const response = createErrorResponse(TEST_REQUEST_ID, error);
      const body = await response.json();
      const serialized = JSON.stringify(body);
      expect(response.status).toBe(403);
      expect(body.error).toEqual({
        code: "FORBIDDEN",
        message: "Forbidden",
        retryable: false,
      });
      expect(serialized).not.toContain(TEST_TOKEN);
      expect(serialized).not.toContain(role);
      expect(serialized).not.toContain("Requires one of");
    },
  );

  it("allows an ADMIN and preserves the authenticated request identity", async () => {
    const authorization = `Bearer ${TEST_TOKEN}`;
    const getUser = configureAuthenticatedUser();
    configureProfileRole("ADMIN");

    await expect(
      requireRole(authenticatedRequest(authorization), "ADMIN"),
    ).resolves.toEqual({ role: "ADMIN", userId: TEST_USER_ID });

    expect(getUser).toHaveBeenCalledWith(TEST_TOKEN);
    expect(getRequestSupabaseClient).toHaveBeenCalledWith(authorization);
  });
});
