import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransportNodeService } from "@/src/modules/transport-node/transport-node.service";
import type { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import type { SpatialService } from "@/src/modules/spatial/spatial.service";
import type { CreateTransportNodeInput } from "@/src/types/domain";

describe("TransportNodeService", () => {
  let repository: any;
  let spatialService: any;
  let service: TransportNodeService;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
    };
    spatialService = {
      validateGeometry: vi.fn().mockResolvedValue(4326),
    };
    service = new TransportNodeService(
      repository as unknown as TransportNodeRepository,
      spatialService as unknown as SpatialService,
    );
  });

  describe("validateNode", () => {
    it("should validate a valid node successfully", async () => {
      const input: CreateTransportNodeInput = {
        name: "Test Station",
        node_type: "STATION",
        transport_mode: "TRAIN",
        geometry: { type: "Point", coordinates: [106.82, -6.17] },
        provenance: { source_id: "test", data_version: "1" } as any,
      };

      const result = await service.validateNode(input);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe("VALIDATED");
      expect(result.issues).toHaveLength(0);
    });

    it("should reject invalid transport mode", async () => {
      const input: CreateTransportNodeInput = {
        name: "Test Station",
        node_type: "STATION",
        transport_mode: "UNKNOWN",
        geometry: { type: "Point", coordinates: [106.82, -6.17] },
        provenance: { source_id: "test", data_version: "1" } as any,
      };

      const result = await service.validateNode(input);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe("REJECTED");
      expect(result.issues).toContain("Invalid transport mode: UNKNOWN");
    });

    it("should reject invalid node type", async () => {
      const input: CreateTransportNodeInput = {
        name: "Test Station",
        node_type: "UNKNOWN",
        transport_mode: "TRAIN",
        geometry: { type: "Point", coordinates: [106.82, -6.17] },
        provenance: { source_id: "test", data_version: "1" } as any,
      };

      const result = await service.validateNode(input);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe("REJECTED");
      expect(result.issues).toContain("Invalid node type: UNKNOWN");
    });
  });
});
