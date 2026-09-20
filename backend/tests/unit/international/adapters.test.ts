import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAdapter } from "@/src/features/international/adapters";
import { fetchJson, fetchText } from "@/src/features/international/http";
import { international_data_sources as sources } from "@/src/features/international/registry";
vi.mock("@/src/features/international/http", async original => ({ ...await original<typeof import("@/src/features/international/http")>(), fetchJson: vi.fn(), fetchText: vi.fn() }));
const q = { lat: -6.2, lon: 106.82, radius: 1000 };
beforeEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("provider normalization (isolated test fixtures, never production records)", () => {
  it("Open-Meteo preserves missing values, forecast units and source grid coordinates", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ latitude: -6.21, longitude: 106.83, current: { time: "2026-09-20T02:15", temperature_2m: null }, hourly: { time: ["2026-09-20T02:00"], visibility: [14000] }, current_units: { temperature_2m: "°C" } });
    const r = await runAdapter("weather", sources["open-meteo"], q);
    expect(r.features[0].geometry).toEqual({ type: "Point", coordinates: [106.83,-6.21] });
    expect(r.features[0].properties.temperature_2m).toBeNull(); expect(r.features[0].properties.visibility_m).toBe(14000);
    expect(r.updated).toBe("2026-09-20T02:15:00.000Z");
  });
  it("BMKG separates forecast valid time from model analysis time", async () => {
    const time = new Date(Date.now() + 3600000).toISOString().slice(0,19).replace("T", " ");
    vi.mocked(fetchJson).mockResolvedValue({ data: [{ lokasi: { desa: "Fixture", lon: 106.82, lat: -6.2 }, cuaca: [[{ utc_datetime: time, analysis_date: "2026-09-20T00:00:00", t: 28, hu: 70 }]] }] });
    const r = await runAdapter("weather", sources.bmkg, { ...q, adm4: "31.71.03.1001" });
    expect(r.updated).toBe("2026-09-20T00:00:00.000Z"); expect(r.features[0].properties.kind).toBe("forecast"); expect(r.features[0].properties.precipitation_mm).toBeNull();
  });
  it("FIRMS parses acquisition UTC and missing FRP without inventing measurements", async () => {
    vi.stubEnv("NASA_FIRMS_MAP_KEY", "fixture-only");
    vi.mocked(fetchText).mockResolvedValue("latitude,longitude,acq_date,acq_time,satellite,confidence,frp\n-6.2,106.82,2026-09-20,315,N,n,\n");
    const r = await runAdapter("active-fire", sources.firms, q);
    expect(r.features[0].properties.timestamp).toBe("2026-09-20T03:15:00.000Z"); expect(r.features[0].properties.frp_mw).toBeNull();
  });
  it("OpenAQ joins each latest measurement to its sensor parameter and provider", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "fixture-only");
    vi.mocked(fetchJson).mockResolvedValueOnce({ results: [{ id: 1, name: "Fixture", coordinates: { latitude: -6.2, longitude: 106.82 }, provider: { name: "Fixture operator" }, sensors: [{ id: 9, parameter: { name: "pm25", units: "µg/m³" } }] }] }).mockResolvedValueOnce({ results: [{ sensorsId: 9, value: 7.2, datetime: { utc: "2026-09-20T02:00:00Z" } }] });
    const r = await runAdapter("air-quality", sources.openaq, q);
    expect(r.features[0].properties).toMatchObject({ parameter: "pm25", sensor: 9, value: 7.2, provider: "Fixture operator", unit: "µg/m³" });
    expect(fetchJson).toHaveBeenCalledWith(expect.any(String), { headers: { "X-API-Key": "fixture-only" } });
  });
  it("GeoNames place results preserve region and do not invent elevation", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ geonames: [{ geonameId: 1, name: "Fixture", lng: "106.82", lat: "-6.2", countryName: "Indonesia", adminName1: "Jakarta", timezone: { timeZoneId: "Asia/Jakarta" } }] });
    const r = await runAdapter("places", sources.geonames, { ...q, q: "Fixture" });
    expect(r.features[0].properties).toMatchObject({ country: "Indonesia", admin_region: "Jakarta", elevation_m: null, timezone: "Asia/Jakarta", freshness: "STATIC" });
  });
  it("GeoNames elevation no-data sentinel remains null in a measured route profile", async () => {
    vi.mocked(fetchJson).mockResolvedValueOnce({ srtm3: -32768 }).mockResolvedValueOnce({ srtm3: 42 });
    const r = await runAdapter("elevation", sources.geonames, { ...q, points: [[106.82,-6.2],[106.821,-6.2]] });
    expect(r.features.map(f => f.properties.elevation_m)).toEqual([null,42]); expect(r.features[1].properties.distance_m).toBeGreaterThan(100);
  });
  it("GeoNames timezone exposes provider-local strings without assuming UTC", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ lat: -6.2, lng: 106.82, timezoneId: "Asia/Jakarta", time: "2026-09-20 09:00", sunrise: "2026-09-20 05:40", sunset: "2026-09-20 17:50" });
    const r = await runAdapter("timezone", sources.geonames, q); expect(r.features[0].properties.local_time).toBe("2026-09-20 09:00"); expect(r.features[0].properties.timestamp).toBeNull();
  });
  it("DKI ArcGIS inventory is spatial and never labeled as live vehicles", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ features: [{ id: 1, geometry: { type: "Point", coordinates: [106.82,-6.2] }, properties: { NAMA: "Fixture stop" } }] });
    const r = await runAdapter("jakarta-transit", sources["dki-transit"], q); expect(r.features[0].properties.availability).toContain("no live vehicle"); expect(String(vi.mocked(fetchJson).mock.calls[0][0])).toContain("distance=1000");
  });
  it.each([["flood","dki-flood","DKI_FLOOD_GEOJSON_URL"], ["disaster","dki-disaster","DKI_DISASTER_GEOJSON_URL"], ["weather-satellite","bmkg-satellite","BMKG_SATELLITE_MANIFEST_URL"]] as const)("%s cannot fabricate an unconnected official source", async (layer,id,key) => {
    vi.stubEnv(key, ""); await expect(runAdapter(layer,sources[id],q)).rejects.toThrow("DATA SOURCE NOT CONNECTED"); expect(fetchJson).not.toHaveBeenCalled();
  });
  it("official flood preserves official status and never supplies missing thresholds", async () => {
    vi.stubEnv("DKI_FLOOD_GEOJSON_URL", "https://example.jakarta.go.id/fixture.geojson");
    vi.mocked(fetchJson).mockResolvedValue({ type: "FeatureCollection", features: [{ geometry: { type: "Point", coordinates: [106.82,-6.2] }, properties: { name: "Fixture gauge", status: "WASPADA", timestamp: "2026-09-20T02:00:00Z" } }] });
    const r = await runAdapter("flood",sources["dki-flood"],q); expect(r.features[0].properties.official_status).toBe("WASPADA"); expect(r.features[0].properties.thresholds).toBeNull();
  });
  it("radar refuses guessed reprojection or bounds", async () => {
    vi.mocked(fetchJson).mockResolvedValueOnce({ fullExtent: { spatialReference: { wkid: 3857 } } }).mockResolvedValueOnce({ layers: [] });
    await expect(runAdapter("weather-radar",sources["bmkg-radar"],q)).rejects.toThrow("verified georeferenced");
  });
  it("satellite refuses images without a verified acquisition timestamp", async () => {
    vi.stubEnv("BMKG_SATELLITE_MANIFEST_URL", "https://example.bmkg.go.id/fixture.json");
    vi.mocked(fetchJson).mockResolvedValue({ image: { url: "https://example.bmkg.go.id/image.png", coordinates: [[1,2],[3,2],[3,0],[1,0]] } });
    await expect(runAdapter("weather-satellite",sources["bmkg-satellite"],q)).rejects.toThrow("verified bounds, timestamp");
  });
  it.each(["bikeshare", "micromobility"] as const)("GBFS %s uses discovered feeds and preserves missing counts/battery", async layer => {
    vi.mocked(fetchText).mockResolvedValue("System ID,Name,Country Code,Location,Auto-Discovery URL,Authentication Type\nfixture,Fixture,ID,Fixture,https://operator.example/gbfs.json,\n");
    const now = Math.floor(Date.now()/1000);
    vi.mocked(fetchJson).mockImplementation(async input => {
      const path = new URL(String(input)).pathname;
      const data = path.endsWith("gbfs.json") ? { en: { feeds: ["system_information","station_information","station_status","vehicle_types","vehicle_status"].map(name => ({ name, url: `https://operator.example/${name}` })) } }
        : path.endsWith("system_information") ? { name: "Fixture", license_id: "CC0-1.0" }
        : path.endsWith("station_information") ? { stations: [{ station_id: "a", lon:106.82, lat:-6.2, name:"Fixture" }] }
        : path.endsWith("station_status") ? { stations: [{ station_id: "a", num_vehicles_available: 0, last_reported: now }] }
        : path.endsWith("vehicle_types") ? { vehicle_types: [{ vehicle_type_id:"s",form_factor:"scooter_standing" }] }
        : { vehicles: [{ vehicle_id:"v", vehicle_type_id:"s",lon:106.82,lat:-6.2,is_disabled:false }] };
      return { data, ttl: 45, last_updated: now };
    });
    const r = await runAdapter(layer,sources.gbfs,{...q,system:"fixture"}); expect(r.ttl).toBe(45); expect(r.features).toHaveLength(1);
    if (layer === "bikeshare") { expect(r.features[0].properties.available_bikes).toBe(0); expect(r.features[0].properties.available_docks).toBeNull(); }
    else { expect(r.features[0].properties.vehicle_type).toBe("scooter_standing"); expect(r.features[0].properties.current_fuel_percent).toBeNull(); }
  });
});
