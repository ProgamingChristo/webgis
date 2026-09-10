import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadCanonicalData } from "@/src/hooks/useCanonicalData";
import { getraApiGet } from "@/src/lib/api/client";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/src/lib/supabase/browser", () => ({
  getBrowserSupabaseClient: () => ({ auth: { getSession: session } }),
}));
const fetchMock = vi.fn();
const node = { id: "node-a", name: "Stasiun", geometry: { type: "Point", coordinates: [106.8, -6.2] } };

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GETRA_API_URL", "https://api.example.test/gateway/");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  session.mockResolvedValue({ data: { session: { access_token: "canonical-test-session" } }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("canonical v1 data integration", () => {
  it("uses the configured gateway path and existing session for all three v1 envelopes", async () => {
    fetchMock.mockImplementation((url: string) => {
      const path = new URL(url).pathname;
      if (path.endsWith("study-areas")) return respond({ data: [{ id: "area-a", name: "Jakarta" }] });
      if (path.endsWith("nodes")) return respond({ items: [node], total: 101, page: 1, limit: 100 });
      return respond({ items: [{ id: "corridor-a", name: "Koridor" }] });
    });
    const controller = new AbortController();
    const data = await loadCanonicalData(controller.signal);
    expect(data).toEqual({
      studyAreas: [{ id: "area-a", name: "Jakarta" }],
      transportNodes: [node],
      transportCorridors: [{ id: "corridor-a", name: "Koridor" }],
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/gateway/api/v1/study-areas",
      "https://api.example.test/gateway/api/v1/transport/nodes?limit=100&page=1",
      "https://api.example.test/gateway/api/v1/transport/corridors?limit=100&page=1",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer canonical-test-session");
      expect(init.signal).toBe(controller.signal);
    }
  });

  it("never sends an anonymous v1 request when the stored session has expired", async () => {
    session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(loadCanonicalData(new AbortController().signal)).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing API configuration before authentication or network access", async () => {
    vi.stubEnv("NEXT_PUBLIC_GETRA_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    await expect(getraApiGet("/api/v1/study-areas")).rejects.toThrow("NEXT_PUBLIC_GETRA_API_URL belum dikonfigurasi");
    expect(session).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, {}, { data: null }, { items: "not-a-list" }])("rejects a malformed v1 list instead of showing empty data %#", async (body) => {
    fetchMock.mockImplementation(() => respond(body));
    await expect(loadCanonicalData(new AbortController().signal)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("keeps authentication errors classified even when a gateway returns HTML", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Unauthorized</html>", { status: 401 }));
    await expect(getraApiGet("/api/v1/transport/nodes")).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });

  it("preserves structured backend error messages for retryable failures", async () => {
    fetchMock.mockResolvedValue(respond({ success: false, error: { message: "Coba lagi nanti." } }, 429));
    await expect(getraApiGet("/api/v1/transport/nodes")).rejects.toMatchObject({ code: "RATE_LIMITED", message: "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi." });
  });

  it("does not start an already cancelled request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(loadCanonicalData(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(session).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects late results from a cancelled account request while a replacement succeeds", async () => {
    const oldController = new AbortController();
    const resolvers: Array<(response: Response) => void> = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => resolvers.push(resolve)));
    const oldResult = expect(loadCanonicalData(oldController.signal)).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    oldController.abort();

    session.mockResolvedValue({ data: { session: { access_token: "replacement-session" } }, error: null });
    fetchMock.mockImplementation(() => respond({ items: [] }));
    await expect(loadCanonicalData(new AbortController().signal)).resolves.toEqual({
      studyAreas: [], transportNodes: [], transportCorridors: [],
    });
    for (const resolve of resolvers) resolve(respond({ items: [node] }));
    await oldResult;
    for (const [, init] of fetchMock.mock.calls.slice(3)) {
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer replacement-session");
    }
  });
});
