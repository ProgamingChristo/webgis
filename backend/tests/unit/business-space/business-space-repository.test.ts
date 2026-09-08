import { describe, expect, it, vi } from "vitest";
import { BusinessSpaceRepository } from "@/src/features/business-space-intelligence/business-space.repository";
import { regionContainsPoint } from "@/src/features/business-space-intelligence/business-space.geometry";

vi.mock("server-only", () => ({}));

describe("Properti Go database geometry and viewport contract", () => {
  it("preserves spatial filters and exact count through the existing MAPID RPC", async () => {
    const point = { type: "Point", coordinates: [106.72, -6.34] };
    const rpc = vi.fn().mockResolvedValue({ data: [{
      id: "property-1", source_type: "PROPERTI_GO", source_record_id: "mapid-1", geometry: point,
      normalized_properties: { alamat: "Pamulang" }, provenance: {}, total_count: 120,
    }], error: null });
    const result = await new BusinessSpaceRepository({ rpc } as never).listPropertyObservations({
      bbox: { minLng: 106.7, minLat: -6.4, maxLng: 106.8, maxLat: -6.3 }, limit: 24, offset: 24,
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("list_mapid_mission_observations_v1", {
      p_source_type: "PROPERTI_GO", p_min_lng: 106.7, p_min_lat: -6.4, p_max_lng: 106.8, p_max_lat: -6.3,
      p_limit: 24, p_offset: 24,
    });
    expect(result.total).toBe(120);
    expect(result.items[0].geometry).toEqual(point);
  });

  it("explicitly requests GeoJSON so a property detail never silently decodes EWKB as zero coordinates", async () => {
    const point = { type: "Point", coordinates: [106.72, -6.34] };
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "property-1", source_record_id: "mapid-1", geometry: point }, error: null }),
    };
    const repo = new BusinessSpaceRepository({ from: vi.fn().mockReturnValue(query) } as never);
    expect((await repo.getPropertyObservation("property-1"))?.geometry).toEqual(point);
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("geometry::json"));
    query.maybeSingle.mockResolvedValueOnce({ data: { id: "property-1", geometry: null } as never, error: null });
    await expect(repo.getPropertyObservation("property-1")).rejects.toThrow();
  });

  it("reads actual city boundaries and their bounds without an envelope-only region inference", async () => {
    const geometry = { type: "MultiPolygon", coordinates: [[[[106.7, -6.4], [107, -6.4], [107, -6.1], [106.7, -6.4]]]] };
    const select = vi.fn().mockResolvedValue({ data: [{ id: "jakarta-selatan", name: "Jakarta Selatan", region_type: "CITY", geometry }], error: null });
    const repo = new BusinessSpaceRepository({ from: vi.fn().mockReturnValue({ select }) } as never);
    expect(await repo.listRegions()).toEqual([{
      id: "jakarta-selatan", name: "Jakarta Selatan", geometry, west: 106.7, south: -6.4, east: 107, north: -6.1,
    }]);
    expect(select).toHaveBeenCalledWith("id,name,region_type,geometry::json");
  });

  it("normalizes verified PostGIS WGS84 metadata without changing coordinates or accepting another CRS", async () => {
    const point = { type: "Point", coordinates: [106.72, -6.34] };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
    const repo = new BusinessSpaceRepository({ from: vi.fn().mockReturnValue(query) } as never);
    query.maybeSingle.mockResolvedValueOnce({ data: { id: "property-1", geometry: { ...point, crs: { type: "name", properties: { name: "EPSG:4326" } } } }, error: null });
    expect((await repo.getPropertyObservation("property-1"))?.geometry).toEqual(point);
    query.maybeSingle.mockResolvedValueOnce({ data: { id: "property-1", geometry: { ...point, crs: { type: "name", properties: { name: "EPSG:3857" } } } }, error: null });
    await expect(repo.getPropertyObservation("property-1")).rejects.toThrow("CRS");
  });

  it("respects polygon holes, disconnected polygons and boundary points", () => {
    const geometry = { type: "MultiPolygon", coordinates: [
      [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]],
      [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
    ] };
    expect(regionContainsPoint(geometry, { longitude: 1.5, latitude: 1.5 })).toBe(false);
    expect(regionContainsPoint(geometry, { longitude: 0.5, latitude: 1.5 })).toBe(true);
    expect(regionContainsPoint(geometry, { longitude: 10.5, latitude: 10.5 })).toBe(true);
    expect(regionContainsPoint(geometry, { longitude: 0, latitude: 2 })).toBe(true);
    expect(regionContainsPoint(geometry, { longitude: 6, latitude: 6 })).toBe(false);
    expect(regionContainsPoint(null, { longitude: 0, latitude: 0 })).toBe(false);
  });
});
