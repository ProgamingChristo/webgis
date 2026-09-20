import { describe, it, expect, vi } from "vitest";
import { valhallaServiceArea } from "@/src/features/routing/valhalla-service-area";
describe("real network isochrone contract", () => {
  it("uses provider contours without inventing counts and caches identical requests", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ type: "FeatureCollection", features: [{ geometry: { type: "LineString", coordinates: [[106.8,-6.2],[106.81,-6.21]] } }] })));
    const data = await valhallaServiceArea({ longitude: 106.8, latitude: -6.2 }, 10, "http://valhalla.test:8002", request);
    expect(data).toMatchObject({ status: "READY", source: "VALHALLA_OSM", reachable_edge_count: null, service_area_type: "NETWORK_ISOCHRONE", geometry: { type: "MultiLineString" } });
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ costing: "pedestrian", contours: [{ time: 10 }], polygons: false });
    await valhallaServiceArea({ longitude: 106.8, latitude: -6.2 }, 10, "http://valhalla.test:8002", request); expect(request).toHaveBeenCalledOnce();
  });
  it("rejects empty, malformed and out-of-range geometry", async () => {
    for (const payload of [{}, { type: "FeatureCollection", features: [] }, { type: "FeatureCollection", features: [{ geometry: { type: "LineString", coordinates: [[999,0],[1,0]] } }] }]) {
      await expect(valhallaServiceArea({longitude:1,latitude:0},15,"http://invalid.test:8002",vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))))).rejects.toThrow();
    }
  });
});
