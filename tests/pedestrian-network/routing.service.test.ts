import { describe, it, expect, vi } from "vitest";
import { RoutingService } from "@/src/modules/pedestrian-network/routing.service";

describe("RoutingService", () => {
  it("should return valid route result on success", async () => {
    const mockData = {
      origin_node_id: 1,
      destination_node_id: 2,
      edge_ids: ["uuid-1", "uuid-2"],
      total_distance_meters: 150,
      total_duration_seconds: 107,
      geometry: { type: "LineString", coordinates: [[0,0], [1,1]] }
    };

    const mockClient = {
      rpc: vi.fn().mockResolvedValue({ data: mockData, error: null })
    };

    const service = new RoutingService(mockClient as any);
    const result = await service.getShortestPath(1, 2, "DUMMY");

    expect(result.originNodeId).toBe(1);
    expect(result.destinationNodeId).toBe(2);
    expect(result.distanceMeters).toBe(150);
    expect(result.analysisMethod).toBe("pgr_dijkstra");
    expect(mockClient.rpc).toHaveBeenCalledWith("calculate_walking_route", {
      p_origin_id: 1,
      p_destination_id: 2,
      p_environment: "DUMMY"
    });
  });

  it("should throw error if route is not found", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "No route found" } })
    };

    const service = new RoutingService(mockClient as any);
    
    await expect(service.getShortestPath(1, 2, "DUMMY")).rejects.toThrow("Routing failed: No route found");
  });
});
