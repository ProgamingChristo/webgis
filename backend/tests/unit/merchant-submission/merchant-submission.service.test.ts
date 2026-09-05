import { describe, it, expect, vi, beforeEach } from "vitest";
import { MerchantSubmissionService } from "@/src/features/merchant-submission/services/merchant-submission.service";

describe("MerchantSubmissionService", () => {
  let mockSupabase: any;
  let service: MerchantSubmissionService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    service = new MerchantSubmissionService(mockSupabase);
  });

  it("should create draft submission when user has UMKM stakeholder mode", async () => {
    const userId = "user-umkm";

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_stakeholder_modes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ mode: "UMKM" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "merchant_submissions") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "sub-123",
                  submitted_by: userId,
                  name: "Warung Kopi Baru",
                  category: "Makanan & Minuman",
                  status: "DRAFT",
                  location: "POINT(106.78 -6.18)",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await service.createDraft(userId, {
      name: "Warung Kopi Baru",
      category: "Makanan & Minuman",
      location: {
        type: "Point",
        coordinates: [106.78, -6.18],
      },
    });

    expect(result.submission.id).toBe("sub-123");
    expect(result.submission.status).toBe("DRAFT");
    expect(result.duplicate_warning).toBeUndefined();
  });

  it("should throw FORBIDDEN when user lacks UMKM stakeholder mode", async () => {
    const userId = "user-general";

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "user_stakeholder_modes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ mode: "COMMUNITY" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { account_role: "USER" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    await expect(
      service.createDraft(userId, {
        name: "Usaha Baru",
        category: "Retail",
        location: { type: "Point", coordinates: [106.78, -6.18] },
      })
    ).rejects.toThrow("Stakeholder Mode UMKM diperlukan");
  });

  it("should submit draft for review (transition DRAFT -> PENDING_REVIEW)", async () => {
    const userId = "user-umkm";
    const subId = "sub-123";

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "merchant_submissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: subId,
                  submitted_by: userId,
                  name: "Warung Kopi",
                  status: "DRAFT",
                  location: "POINT(106.78 -6.18)",
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: subId,
                        submitted_by: userId,
                        name: "Warung Kopi",
                        status: "PENDING_REVIEW",
                        location: "POINT(106.78 -6.18)",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await service.submitForReview(subId, userId);
    expect(result.status).toBe("PENDING_REVIEW");
  });

  it("should atomically approve submission and create verified canonical merchant", async () => {
    const adminId = "admin-1";
    const subId = "sub-123";
    const submitterId = "user-umkm";

    mockSupabase.rpc.mockResolvedValue({ data: "merchant-created-1", error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { account_role: "ADMIN" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "merchant_submissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: subId,
                  submitted_by: submitterId,
                  name: "Warung Kopi Selamat",
                  description: "Kopi nikmat",
                  address: "Jl. Kebon Jeruk",
                  category: "Makanan & Minuman",
                  location: "POINT(106.78 -6.18)",
                  status: "APPROVED",
                  reviewed_by: adminId,
                  canonical_merchant_id: "merchant-created-1",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await service.adminApprove(subId, adminId, "Disetujui");
    expect(result.submission.status).toBe("APPROVED");
    expect(result.merchant_id).toBe("merchant-created-1");
  });
});
