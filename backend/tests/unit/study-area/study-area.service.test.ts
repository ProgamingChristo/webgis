import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudyAreaService } from "@/src/modules/study-area/study-area.service";
import { SpatialService } from "@/src/modules/spatial/spatial.service";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

describe("StudyAreaService", () => {
  let service: StudyAreaService;
  let mockRepo: ReturnType<typeof vi.mocked<StudyAreaRepository>>;
  let mockSpatialService: ReturnType<typeof vi.mocked<SpatialService>>;

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
      create: vi.fn(),
    } as any;

    mockSpatialService = {
      validateGeometry: vi.fn(),
    } as any;

    service = new StudyAreaService(mockRepo, mockSpatialService);
  });

  describe("validatePilotGeometry", () => {
    it("should return true for valid SRID 4326 geometry", async () => {
      mockSpatialService.validateGeometry.mockResolvedValue(4326);
      const isValid = await service.validatePilotGeometry({ type: "Point", coordinates: [0, 0] });
      expect(isValid).toBe(true);
    });

    it("should return false for invalid SRID geometry", async () => {
      mockSpatialService.validateGeometry.mockResolvedValue(3857);
      const isValid = await service.validatePilotGeometry({ type: "Point", coordinates: [0, 0] });
      expect(isValid).toBe(false);
    });

    it("should return false if validation throws an error", async () => {
      mockSpatialService.validateGeometry.mockRejectedValue(new Error("Invalid geometry"));
      const isValid = await service.validatePilotGeometry({ type: "Point", coordinates: [0, 0] });
      expect(isValid).toBe(false);
    });
  });

  describe("findPilotByCode", () => {
    it("should return pilot area matching the code", async () => {
      const mockItems = [
        { name: "OTHER_AREA" },
        { name: "GETRA_DUMMY_PILOT_A" },
      ];
      mockRepo.findMany.mockResolvedValue({ items: mockItems } as any);

      const result = await service.findPilotByCode("GETRA_DUMMY_PILOT_A");
      expect(result).toEqual({ name: "GETRA_DUMMY_PILOT_A" });
    });

    it("should return null if code is not found", async () => {
      mockRepo.findMany.mockResolvedValue({ items: [] } as any);
      const result = await service.findPilotByCode("GETRA_DUMMY_PILOT_A");
      expect(result).toBeNull();
    });
  });
});
