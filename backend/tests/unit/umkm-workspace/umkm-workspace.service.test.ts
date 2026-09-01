import { describe, it, expect, vi, beforeEach } from "vitest";
import { UmkmWorkspaceService } from "@/src/features/umkm-workspace/services/umkm-workspace.service";

describe("UmkmWorkspaceService", () => {
  let mockSupabase: any;
  let service: UmkmWorkspaceService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
    service = new UmkmWorkspaceService(mockSupabase);
  });

  it("should aggregate verified merchants, pending submissions, and active campaigns", async () => {
    const userId = "user-123";
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "m-1",
                  name: "Warung Kopi Selamat",
                  address: "Jl. Kebon Jeruk",
                  publish_status: "PUBLISHED",
                  verification_status: "VERIFIED",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "ad_campaigns") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id: "c-1", merchant_id: "m-1", status: "ACTIVE" },
                { id: "c-2", merchant_id: "m-1", status: "PAUSED" },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "merchant_claims") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "merchant_submissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "sub-1",
                      name: "Toko Baru",
                      category: "Retail",
                      status: "PENDING_REVIEW",
                      address: "Jl. Sudirman",
                      created_at: "2026-08-23T10:00:00Z",
                      updated_at: "2026-08-23T10:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const summary = await service.getWorkspaceSummary(userId);

    expect(summary.verified_merchants_count).toBe(1);
    expect(summary.active_campaigns_count).toBe(1);
    expect(summary.pending_submissions_count).toBe(1);
    expect(summary.owned_merchants).toHaveLength(1);
    expect(summary.owned_merchants[0].campaigns_count).toBe(2);
    expect(summary.recent_submissions).toHaveLength(1);
    expect(summary.recent_claims).toEqual([]);
  });

  it("should handle user with 0 owned merchants gracefully", async () => {
    const userId = "user-empty";
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "merchant_claims") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "merchant_submissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const summary = await service.getWorkspaceSummary(userId);

    expect(summary.verified_merchants_count).toBe(0);
    expect(summary.active_campaigns_count).toBe(0);
    expect(summary.pending_submissions_count).toBe(0);
    expect(summary.owned_merchants).toEqual([]);
    expect(summary.recent_submissions).toEqual([]);
    expect(summary.recent_claims).toEqual([]);
  });

  it("does not treat an approved claim without canonical owner_id as active authority", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({
              data: [{
                id: "claimed-1", name: "Merchant Claimed", address: null,
                description: "Bakso", metadata: {}, publish_status: "PUBLISHED",
                verification_status: "VERIFIED",
              }],
              error: null,
            }),
          }),
        };
      }
      if (table === "merchant_claims") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "ad_campaigns") {
        return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      }
      if (table === "merchant_submissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
            }),
          }),
        };
      }
      return {};
    });

    const summary = await service.getWorkspaceSummary("claimant");
    expect(summary.verified_merchants_count).toBe(0);
    expect(summary.owned_merchants).toEqual([]);
    expect(summary.recent_claims).toEqual([]);
  });

  it("surfaces pending merchant claims in workspace status without granting ownership", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "merchants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            in: vi.fn().mockResolvedValue({
              data: [{
                id: "donat-dhika",
                name: "Warung Donat Dhika",
                address: "Dekat Palmerah",
                description: "Makanan & Minuman",
                metadata: {},
                publish_status: "PUBLISHED",
                verification_status: "VERIFIED",
              }],
              error: null,
            }),
          }),
        };
      }
      if (table === "merchant_claims") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{
                      id: "claim-1",
                      merchant_id: "donat-dhika",
                      status: "PENDING",
                      note: null,
                      created_at: "2026-08-30T09:00:00Z",
                      reviewed_at: null,
                    }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "merchant_submissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
            }),
          }),
        };
      }
      return {};
    });

    const summary = await service.getWorkspaceSummary("claimant");

    expect(summary.verified_merchants_count).toBe(0);
    expect(summary.owned_merchants).toEqual([]);
    expect(summary.pending_submissions_count).toBe(1);
    expect(summary.recent_claims).toEqual([
      expect.objectContaining({
        merchant_id: "donat-dhika",
        merchant_name: "Warung Donat Dhika",
        status: "PENDING",
      }),
    ]);
  });
});
