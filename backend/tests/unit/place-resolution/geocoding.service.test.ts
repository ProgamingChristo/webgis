import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("server-side place geocoding", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env.PLACE_RESOLVER_BASE_URL;
    delete process.env.PLACE_RESOLVER_USER_AGENT;
  });

  it("returns validated Indonesian coordinates from the configured resolver", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      display_name: "JPO Blok E, Jakarta Pusat, Indonesia",
      lat: "-6.1846856",
      lon: "106.8148915",
      name: "JPO Blok E",
      osm_id: 123,
      osm_type: "node",
    }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { searchGeocodedPlaces } = await import(
      "@/src/features/place-resolution/geocoding.service"
    );

    await expect(searchGeocodedPlaces("JPO Blok E")).resolves.toEqual([expect.objectContaining({
      label: "JPO Blok E",
      latitude: -6.1846856,
      longitude: 106.8148915,
      source: "OPENSTREETMAP_NOMINATIM",
    })]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("countrycodes=id");
    expect(init.headers["User-Agent"]).toContain("GETRA");
  });

  it("does not cache or fabricate a failed resolver response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("upstream unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const { searchGeocodedPlaces } = await import(
      "@/src/features/place-resolution/geocoding.service"
    );

    await expect(searchGeocodedPlaces("unresolvable place")).resolves.toEqual([]);
  });
});
