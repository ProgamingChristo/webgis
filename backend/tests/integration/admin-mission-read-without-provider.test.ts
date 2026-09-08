import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/auth", () => ({ requireRole: vi.fn().mockResolvedValue({ accountRole: "ADMIN", userId: "admin" }) }));
vi.mock("@/src/lib/supabase/server", () => ({
  getServiceRoleSupabaseClient: () => {
    const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, maybeSingle: mocks.read };
    return { from: () => query };
  },
}));
import { GET } from "@/app/api/admin/mission/sync/route";
afterEach(() => vi.unstubAllEnvs());
describe("Mission history independent of ingestion configuration", () => {
  it("reads all history without requiring a MAPID client or triggering ingestion", async () => {
    vi.stubEnv("MAPID_API_KEY", "");
    vi.stubEnv("MAPID_BASE_URL", "");
    mocks.read.mockResolvedValue({ data: null, error: null });
    const response = await GET(new NextRequest("http://localhost/api/admin/mission/sync"));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data.sources).toHaveLength(4);
    expect(result.data.sources.every((s: { status: string }) => s.status === "NEVER_SYNCED")).toBe(true);
    expect(mocks.read).toHaveBeenCalledTimes(4);
  });
  it("does not turn a database read failure into ready or empty history", async () => {
    mocks.read.mockResolvedValue({ data: null, error: new Error("test database failure") });
    const response = await GET(new NextRequest("http://localhost/api/admin/mission/sync"));
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect((await response.json()).success).toBe(false);
  });
});
