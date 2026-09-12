import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/server", () => ({ getRequestSupabaseClient: vi.fn() }));
vi.mock("@/src/lib/auth", () => ({ requireAuthenticatedUser: vi.fn().mockResolvedValue("fixture-user") }));
vi.mock("@/src/lib/rate-limit", () => ({ rateLimiter: { checkLimit: vi.fn() } }));
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/src/repositories/study-area.repository", () => ({
  StudyAreaRepository: class { findMany = findMany; },
}));
import { GET, OPTIONS } from "@/app/api/v1/study-areas/route";

describe("study area integration CORS", () => {
  beforeEach(() => {
    vi.stubEnv("FRONTEND_ALLOWED_ORIGINS", "http://localhost:3100");
    vi.stubEnv("APP_BASE_URL", "http://localhost:8180");
    findMany.mockResolvedValue({ items: [{ id: "area", provenance: null }] });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("allows the exact integration frontend preflight", async () => {
    const response = await OPTIONS(new NextRequest("http://localhost:8180/api/v1/study-areas", {
      method: "OPTIONS", headers: { Origin: "http://localhost:3100",
        "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
    }));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3100");
  });
  it("returns authenticated data with CORS and preserves the response shape", async () => {
    const response = await GET(new NextRequest("http://localhost:8180/api/v1/study-areas", {
      headers: { Origin: "http://localhost:3100", Authorization: "Bearer test-only" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "area", provenance: null }] });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3100");
  });
  it("does not grant unapproved origins or unauthenticated requests", async () => {
    const denied = await OPTIONS(new NextRequest("http://localhost:8180/api/v1/study-areas", {
      method: "OPTIONS", headers: { Origin: "https://unapproved.invalid", "Access-Control-Request-Method": "GET" },
    }));
    expect(denied.status).toBe(403);
    expect(denied.headers.has("Access-Control-Allow-Origin")).toBe(false);
    const unauthenticated = await GET(new NextRequest("http://localhost:8180/api/v1/study-areas", { headers: { Origin: "http://localhost:3100" } }));
    expect(unauthenticated.status).toBe(401);
  });
});
