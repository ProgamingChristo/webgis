import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransportRouteStopService } from "@/src/modules/transport-route-stop/transport-route-stop.service";
import type { TransportRouteStopRepository } from "@/src/repositories/transport-route-stop.repository";
import type { CreateTransportRouteStopInput } from "@/src/types/domain";

describe("TransportRouteStopService", () => {
  let repository: any;
  let service: TransportRouteStopService;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      upsertByCorridorAndNode: vi.fn(),
    };
    service = new TransportRouteStopService(
      repository as unknown as TransportRouteStopRepository,
    );
  });

  describe("createRouteStop", () => {
    it("should successfully create a route stop relation", async () => {
      const input: CreateTransportRouteStopInput = {
        corridor_id: "c-123",
        node_id: "n-456",
        stop_sequence: 1,
      };

      repository.create.mockResolvedValue({ id: "rs-1", ...input });

      const result = await service.createRouteStop(input);
      expect(result.stop_sequence).toBe(1);
      expect(repository.create).toHaveBeenCalledWith(input);
    });

    it("should reject negative sequence", async () => {
      const input: CreateTransportRouteStopInput = {
        corridor_id: "c-123",
        node_id: "n-456",
        stop_sequence: -1,
      };

      await expect(service.createRouteStop(input)).rejects.toThrow("stop_sequence must be >= 0");
    });
  });
});
