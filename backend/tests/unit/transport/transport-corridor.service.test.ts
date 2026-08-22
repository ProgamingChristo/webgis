import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransportCorridorService } from "@/src/modules/transport-corridor/transport-corridor.service";
import type { TransportCorridorRepository } from "@/src/repositories/transport-corridor.repository";
import type { SpatialService } from "@/src/modules/spatial/spatial.service";
import type { CreateTransportCorridorInput } from "@/src/types/domain";

describe("TransportCorridorService", () => {
  let repository: any;
  let spatialService: any;
  let service: TransportCorridorService;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
    };
    spatialService = {
      validateGeometry: vi.fn().mockResolvedValue(4326),
    };
    service = new TransportCorridorService(
      repository as unknown as TransportCorridorRepository,
      spatialService as unknown as SpatialService,
    );
  });

  describe("validateCorridor", () => {
    it("should validate a valid corridor successfully", async () => {
      const input: CreateTransportCorridorInput = {
        name: "Test Line",
        transport_mode: "TRAIN",
        geometry: { type: "MultiLineString", coordinates: [[[106.82, -6.17], [106.83, -6.18]]] },
        provenance: { source_id: "test", data_version: "1" } as any,
      };

      const result = await service.validateCorridor(input);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe("VALIDATED");
      expect(result.issues).toHaveLength(0);
    });

    it("should reject invalid transport mode", async () => {
      const input: CreateTransportCorridorInput = {
        name: "Test Line",
        transport_mode: "UNKNOWN",
        geometry: { type: "MultiLineString", coordinates: [[[106.82, -6.17], [106.83, -6.18]]] },
        provenance: { source_id: "test", data_version: "1" } as any,
      };

      const result = await service.validateCorridor(input);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe("REJECTED");
      expect(result.issues).toContain("Invalid transport mode: UNKNOWN");
    });
  });
});
