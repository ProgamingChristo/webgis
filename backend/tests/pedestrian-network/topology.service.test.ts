import { describe, it, expect, vi } from "vitest";
import { TopologyService } from "@/src/modules/pedestrian-network/topology.service";

describe("TopologyService", () => {
  const createMockClient = (rpcResult: any) => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis()
    };
    const rpcBuilder = {
      single: vi.fn().mockResolvedValue(rpcResult)
    };
    return {
      rpc: vi.fn().mockReturnValue(rpcBuilder),
      from: vi.fn().mockReturnValue(queryBuilder)
    };
  };

  it("should validate network correctly when there are no errors", async () => {
    const mockClient = createMockClient({ data: { errors: [] }, error: null });

    const service = new TopologyService(mockClient as any, {} as any, {} as any);
    const result = await service.validateNetwork("study-area-1", "DUMMY");

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(mockClient.rpc).toHaveBeenCalledWith("check_pedestrian_network_topology", {
      p_study_area_id: "study-area-1",
      p_environment: "DUMMY"
    });
  });

  it("should return invalid status if RPC returns errors", async () => {
    const mockClient = createMockClient({ 
      data: { errors: ["Edge E1 is a self-loop"] }, 
      error: null 
    });

    const service = new TopologyService(mockClient as any, {} as any, {} as any);
    const result = await service.validateNetwork("study-area-1", "DUMMY");

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Edge E1 is a self-loop");
  });
});

