import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, OPTIONS, POST } from "../../app/api/[...path]/route";

const context = (path = ["v1", "transport", "nodes"]) => ({ params: Promise.resolve({ path }) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional backend proxy", () => {
  it.each(["", "file:///tmp/backend", "http://user:password@backend:8080", "http://backend:8080/nested"])("does not forward with an absent or invalid backend: %s", async (backend) => {
    vi.stubEnv("GETRA_BACKEND_INTERNAL_URL", backend);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(new NextRequest("http://frontend:3000/api/v1/transport/nodes"), context())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves the browser origin and backend rejection instead of spoofing a trusted origin", async () => {
    vi.stubEnv("GETRA_BACKEND_INTERNAL_URL", "http://backend:8080");
    const fetchMock = vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://frontend:3000/api/v1/transport/nodes", { headers: { origin: "https://untrusted.example" } }), context());
    expect(fetchMock.mock.calls[0][1].headers.get("origin")).toBe("https://untrusted.example");
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("delegates preflight to the backend's exact origin policy", async () => {
    vi.stubEnv("GETRA_BACKEND_INTERNAL_URL", "http://backend:8080");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://getra.example", vary: "Origin" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await OPTIONS(new NextRequest("http://frontend:3000/api/v1/transport/nodes", { method: "OPTIONS", headers: { origin: "https://getra.example", "access-control-request-method": "POST" } }), context());
    expect(fetchMock.mock.calls[0][1].method).toBe("OPTIONS");
    expect(fetchMock.mock.calls[0][1].headers.get("access-control-request-method")).toBe("POST");
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://getra.example");
  });

  it("preserves query, body and auth while stripping stale compression and connection headers", async () => {
    vi.stubEnv("GETRA_BACKEND_INTERNAL_URL", "http://backend:8080");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { headers: { "content-encoding": "gzip", "content-length": "40", connection: "x-internal", "x-internal": "remove" } }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new NextRequest("http://frontend:3000/api/routing?mode=car", { method: "POST", body: '{"origin":[1,2]}', headers: { authorization: "Bearer fixture", "content-type": "application/json" } }), context(["routing"]));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend:8080/api/routing?mode=car");
    expect(init.headers.get("authorization")).toBe("Bearer fixture");
    expect(new TextDecoder().decode(init.body)).toBe('{"origin":[1,2]}');
    expect(init.cache).toBe("no-store");
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("x-internal")).toBeNull();
  });

  it.each([["..", "private"], ["v1/private"], ["v1\\private"]])("rejects paths escaping the API namespace: %j", async (...path) => {
    vi.stubEnv("GETRA_BACKEND_INTERNAL_URL", "http://backend:8080");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(new NextRequest("http://frontend:3000/api/safe"), context(path))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
