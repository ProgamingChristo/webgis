import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../app/api/basemap/mapid/[...path]/route";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("MAPID credential proxy", () => {
  it("uses relative resources behind a reverse proxy and strips all keys", async () => {
    vi.stubEnv("MAPID_BASEMAP_KEY", "test-only-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ version: 8, glyphs: "https://basemap.mapid.io/fonts/{fontstack}/{range}.pbf?key=test-only-secret", sources: { mapid: { type: "vector", url: "https://basemap.mapid.io/data/mapidtiles.json?key=test-only-secret" } } })));
    const response = await GET(new NextRequest("http://0.0.0.0:3000/api/basemap/mapid/styles/default/style.json"), { params: Promise.resolve({ path: ["styles", "default", "style.json"] }) });
    const text = await response.text(); expect(text).not.toContain("test-only-secret"); expect(text).not.toContain("0.0.0.0"); expect(JSON.parse(text).glyphs).toBe("/api/basemap/mapid/fonts/{fontstack}/{range}.pbf");
  });
  it("rejects traversal and missing credentials", async () => {
    vi.stubEnv("MAPID_BASEMAP_KEY", ""); vi.stubEnv("NEXT_PUBLIC_MAPID_BASEMAP_KEY", "");
    const req = new NextRequest("http://localhost/api/basemap/mapid/x");
    expect((await GET(req, { params: Promise.resolve({ path: ["styles", "..", "style.json"] }) })).status).toBe(400);
    expect((await GET(req, { params: Promise.resolve({ path: ["styles", "basic", "style.json"] }) })).status).toBe(503);
  });
});
