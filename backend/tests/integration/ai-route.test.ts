import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiProviderError, RateLimitExceededError } from "@/src/lib/errors";

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

const originalProvider = process.env.AI_PROVIDER;
const originalSub2ApiKey = process.env.SUB2API_API_KEY;

function aiRequest(authorization?: string, question = "Apa yang tersedia di area ini?") {
  return new NextRequest("http://localhost/api/ai/ask", {
    body: JSON.stringify({
      question,
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

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (originalSub2ApiKey === undefined) delete process.env.SUB2API_API_KEY;
    else process.env.SUB2API_API_KEY = originalSub2ApiKey;
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
      `${TEST_USER_ID}:mutation:ai:ask`,
    );
    expect(mocks.generateStructured).not.toHaveBeenCalled();
  });

  it("returns a canonical 503 instead of a deterministic answer when explicit Sub2API has no key", async () => {
    process.env.AI_PROVIDER = "sub2api";
    delete process.env.SUB2API_API_KEY;
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mocks.getServerSupabaseClient.mockReturnValue({ auth: { getUser } } as unknown as SupabaseClient);
    mocks.generateStructured.mockRejectedValue(new AiProviderError({
      category: "configuration",
      provider: "sub2api",
    }));

    const response = await POST(aiRequest("Bearer VALID-TOKEN", "Apa yang bisa kamu bantu?"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "AI_PROVIDER_CONFIGURATION",
        message: "Provider AI belum tersedia. Periksa konfigurasi server.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("0 UMKM");
    expect(body.request_id).toEqual(expect.any(String));
  });

  it("returns a canonical 504 and never falls back when Sub2API times out", async () => {
    process.env.AI_PROVIDER = "sub2api";
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });
    mocks.getServerSupabaseClient.mockReturnValue({ auth: { getUser } } as unknown as SupabaseClient);
    mocks.generateStructured.mockRejectedValue(new AiProviderError({
      category: "timeout",
      provider: "sub2api",
    }));

    const response = await POST(aiRequest("Bearer VALID-TOKEN"));
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("AI_PROVIDER_TIMEOUT");
    expect(body.data).toBeUndefined();
  });
});
