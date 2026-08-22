import { describe, it, expect, vi, beforeEach } from "vitest";
import { UmkmService } from "@/src/modules/umkm/umkm.service";

describe("UmkmService", () => {
  let umkmService: UmkmService;
  let mockUmkmRepo: any;
  let mockAccessService: any;
  let mockClient: any;

  beforeEach(() => {
    mockUmkmRepo = {
      findByCode: vi.fn(),
      create: vi.fn(),
      findNearby: vi.fn(),
      findById: vi.fn(),
    };
    mockAccessService = {
      snapEntityToNetwork: vi.fn(),
    };
    mockClient = {} as any;

    umkmService = new UmkmService(mockClient, mockUmkmRepo, mockAccessService);
  });

  describe("create", () => {
    it("should throw error if UMKM with same code exists in environment", async () => {
      mockUmkmRepo.findByCode.mockResolvedValue({ id: "existing-id" });

      const input = {
        code: "TEST-001",
        name: "Test UMKM",
        category: "FOOD",
        geometry: { type: "Point" as const, coordinates: [106.8, -6.2] as [number, number] },
        studyAreaId: "00000000-0000-0000-0000-000000000000",
        environment: "DUMMY",
        provenance: {
          source_id: "b368725f-2ab2-4b24-8178-999981e194ba",
          source_record_id: "src-1",
          data_version: "1",
          validation_status: "VALIDATED" as const,
          validated_at: new Date().toISOString(),
        }
      };

      await expect(umkmService.create(input)).rejects.toThrow(/already exists/);
    });

    it("should create UMKM and try to snap to network", async () => {
      mockUmkmRepo.findByCode.mockResolvedValue(null);
      mockUmkmRepo.create.mockResolvedValue({
        id: "new-umkm-id",
        code: "TEST-001",
        geometry: { type: "Point" as const, coordinates: [106.8, -6.2] },
        environment: "DUMMY"
      });

      const input = {
        code: "TEST-001",
        name: "Test UMKM",
        category: "FOOD",
        geometry: { type: "Point" as const, coordinates: [106.8, -6.2] as [number, number] },
        studyAreaId: "00000000-0000-0000-0000-000000000000",
        environment: "DUMMY",
        provenance: {
          source_id: "b368725f-2ab2-4b24-8178-999981e194ba",
          source_record_id: "src-1",
          data_version: "1",
          validation_status: "VALIDATED" as const,
          validated_at: new Date().toISOString(),
        }
      };

      const result = await umkmService.create(input);
      
      expect(result.id).toBe("new-umkm-id");
      expect(mockUmkmRepo.create).toHaveBeenCalledWith(expect.objectContaining({ code: "TEST-001" }));
      expect(mockAccessService.snapEntityToNetwork).toHaveBeenCalledWith(
        "UMKM",
        "new-umkm-id",
        input.geometry,
        50,
        "DUMMY"
      );
    });
  });
});
