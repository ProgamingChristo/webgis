import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitExceededError } from "@/src/lib/errors";

const mocks = vi.hoisted(() => ({
  checkLimit: vi.fn(),
  generateStructured: vi.fn(),
  getRequestSupabaseClient: vi.fn(),
  getServerSupabaseClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/rate-limit", () => ({
  rateLimiter: { checkLimit: mocks.checkLimit },
}));
vi.mock("@/src/lib/supabase/server", () => ({
  getRequestSupabaseClient: mocks.getRequestSupabaseClient,
  getServerSupabaseClient: mocks.getServerSupabaseClient,
}));
vi.mock("@/lib/ai/provider", () => ({
  generateStructured: mocks.generateStructured,
}));

import { POST } from "@/app/api/ai/ask/route";

const TEST_USER_ID = "70000000-0000-4000-8000-000000000001";

function aiRequest(authorization?: string) {
  return new NextRequest("http://localhost/api/ai/ask", {
    body: JSON.stringify({
      question: "Apa yang tersedia di area ini?",
      active_experience: "GENERAL",
    }),
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });
}

describe("/api/ai/ask security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkLimit.mockResolvedValue(undefined);
    mocks.generateStructured.mockReset();
  });

  it("rejects missing bearer token before provider and database grounding work", async () => {
    const response = await POST(aiRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mocks.getServerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.getRequestSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.generateStructured).not.toHaveBeenCalled();
    expect(mocks.checkLimit).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer token before any billable provider call", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: new Error("invalid token"),
    });
    mocks.getServerSupabaseClient.mockReturnValue({
      auth: { getUser },
    } as unknown as SupabaseClient);

    const response = await POST(aiRequest("Bearer FAKE-TOKEN"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(getUser).toHaveBeenCalledWith("FAKE-TOKEN");
    expect(mocks.getRequestSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.generateStructured).not.toHaveBeenCalled();
    expect(mocks.checkLimit).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("FAKE-TOKEN");
  });

  it("rate limits authenticated requests before provider calls", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mocks.getServerSupabaseClient.mockReturnValue({
      auth: { getUser },
    } as unknown as SupabaseClient);
    mocks.checkLimit.mockRejectedValue(new RateLimitExceededError(10));

    const response = await POST(aiRequest("Bearer VALID-TOKEN"));

    expect(response.status).toBe(429);
    expect(mocks.checkLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      `${TEST_USER_ID}:ai:ask`,
    );
    expect(mocks.generateStructured).not.toHaveBeenCalled();
  });
});
