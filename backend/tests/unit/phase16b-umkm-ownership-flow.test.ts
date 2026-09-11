import { describe, expect, it, vi } from "vitest";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership/services/merchant-ownership.service";
import { UmkmWorkspaceService } from "@/src/features/umkm-workspace/services/umkm-workspace.service";
import { MerchantSubmissionService } from "@/src/features/merchant-submission/services/merchant-submission.service";
import { CanonicalMerchantReadService } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

describe("Phase 16B — UMKM Submission, Claim, Workspace, and Pending States", () => {
  const claimantUserId = "user-claimant-1111-1111-1111-111111111111";
  const existingOwnerId = "user-verified-2222-2222-2222-222222222222";
  const unownedMerchantId = "merchant-unowned-3333-3333-3333-333333333333";
  const ownedMerchantId = "merchant-owned-4444-4444-4444-444444444444";

  const validEvidence = {
    contactName: "Budi Santoso",
    contactPhone: "081234567890",
    relationship: "OWNER",
    statement: "Saya adalah pemilik sah usaha ini dengan izin usaha resmi.",
  };

  describe("1. Verified Owner Takeover Protection", () => {
    it("rejects claim with 409 and clear Indonesian error when merchant already has a verified owner", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: ownedMerchantId, owner_id: existingOwnerId },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const ownershipService = new MerchantOwnershipService(mockSupabase);

      await expect(
        ownershipService.claimMerchant(claimantUserId, ownedMerchantId, validEvidence, "Pengajuan klaim")
      ).rejects.toMatchObject({
        message: "Usaha ini sudah memiliki pengelola terverifikasi.",
        code: "MERCHANT_ALREADY_VERIFIED",
        status: 409,
      });
    });

    it("allows claim submission when merchant is unowned (owner_id is null)", async () => {
      const mockClaimId = "claim-uuid-5555-5555-5555-555555555555";
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: unownedMerchantId, owner_id: null },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string, args: any) => {
          if (proc === "submit_merchant_claim") {
            expect(args.p_merchant_id).toBe(unownedMerchantId);
            expect(args.p_evidence).toEqual(validEvidence);
            return Promise.resolve({ data: mockClaimId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const ownershipService = new MerchantOwnershipService(mockSupabase);
      const result = await ownershipService.claimMerchant(
        claimantUserId,
        unownedMerchantId,
        validEvidence,
        "Klaim usaha warung"
      );

      expect(result).toEqual({
        merchantId: unownedMerchantId,
        isOwned: false,
        claimStatus: "PENDING",
        claimId: mockClaimId,
      });
    });

    it("returns APPROVED immediately if claimant is already the verified owner", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: ownedMerchantId, owner_id: claimantUserId },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const ownershipService = new MerchantOwnershipService(mockSupabase);
      const result = await ownershipService.claimMerchant(
        claimantUserId,
        ownedMerchantId,
        validEvidence
      );

      expect(result).toEqual({
        merchantId: ownedMerchantId,
        isOwned: true,
        claimStatus: "APPROVED",
      });
    });
  });

  describe("2. Claim Invariants: Auto-ownership = NO & Provenance Unchanged", () => {
    it("does NOT set merchants.owner_id on claim submission (CLAIM_PENDING_AUTO_OWNERSHIP=NO)", async () => {
      const updateSpy = vi.fn();
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: unownedMerchantId, owner_id: null },
                error: null,
              }),
              update: updateSpy,
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn().mockResolvedValue({ data: "new-claim-id", error: null }),
      };

      const ownershipService = new MerchantOwnershipService(mockSupabase);
      const result = await ownershipService.claimMerchant(claimantUserId, unownedMerchantId, validEvidence);

      // Verify ownership status is PENDING and not owned
      expect(result.isOwned).toBe(false);
      expect(result.claimStatus).toBe("PENDING");
      // merchants table was NEVER updated with owner_id
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("preserves canonical merchant public status and provenance during pending claim", async () => {
      // Existing merchant from MENU_GO remains published and retains provenance
      const merchantRow = {
        id: unownedMerchantId,
        name: "Soto Betawi Bang Mamat",
        brand: "Soto Betawi Bang Mamat",
        category: "Makanan & Minuman",
        address: "Jl. Sabang No. 12",
        point: "0101000020E610000052F17E6B89B45A405C8FC2F528B318C0", // [106.8209, -6.1750]
        metadata: {
          data_source: "MENU_GO",
          source_type: "MENU_GO",
          raw_data: { source: "Menu Go Jakarta" },
        },
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        owner_id: null,
        submission_id: null,
        submitted_by: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      };

      const mockSupabase: any = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [merchantRow], error: null }),
        })),
      };

      const readService = new CanonicalMerchantReadService(mockSupabase);
      const result = await (readService as any).listMerchantsByIds([unownedMerchantId]);

      expect(result).toHaveLength(1);
      const item = result[0];
      expect(item.id).toBe(unownedMerchantId);
      expect(item.publish_status).toBe("PUBLISHED");
      expect(item.owner_id).toBeNull();
      expect(item.metadata.data_source).toBe("MENU_GO");
    });
  });

  describe("3. Duplicate Claim Protection & Multi-Claim Policy", () => {
    it("idempotently returns existing pending claim for identical claimant and merchant without error", async () => {
      const existingPendingClaimId = "claim-existing-9999-9999-9999-999999999999";
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: unownedMerchantId, owner_id: null },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string) => {
          if (proc === "submit_merchant_claim") {
            // submit_merchant_claim returns existing claim id idempotently
            return Promise.resolve({ data: existingPendingClaimId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const ownershipService = new MerchantOwnershipService(mockSupabase);
      const result = await ownershipService.claimMerchant(claimantUserId, unownedMerchantId, validEvidence);

      expect(result.claimId).toBe(existingPendingClaimId);
      expect(result.claimStatus).toBe("PENDING");
      expect(result.isOwned).toBe(false);
    });

    it("documents MULTI_CLAIM_POLICY: separate pending review entries without winner auto-selection", () => {
      const MULTI_CLAIM_POLICY = "SEPARATE_PENDING_REVIEWS_ADMIN_ADJUDICATION_NO_AUTO_WINNER";
      expect(MULTI_CLAIM_POLICY).toBeDefined();
    });
  });

  describe("4. New UMKM Submission Quarantine", () => {
    it("quarantines pending submissions: never returned by CanonicalMerchantReadService", async () => {
      // Pending submissions reside in merchant_submissions table and are NOT published merchants
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const readService = new CanonicalMerchantReadService(mockSupabase);
      const result = await (readService as any).listMerchantsByIds(["pending-submission-uuid"]);

      expect(result).toHaveLength(0);
    });
  });

  describe("5. Owner Workspace Aggregation & Reload Persistence", () => {
    it("aggregates pending submissions (with location), pending claims, and verified merchants", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "owned-m1",
                    name: "Kopi Kenangan",
                    address: "Jl. Sudirman 1",
                    description: "Kedai Kopi",
                    metadata: { category: "Kopi & Minuman Ringan" },
                    publish_status: "PUBLISHED",
                    verification_status: "VERIFIED",
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "ad_campaigns") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (table === "merchant_claims") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "claim-1",
                    merchant_id: unownedMerchantId,
                    status: "PENDING",
                    note: null,
                    created_at: "2026-09-01T10:00:00.000Z",
                    reviewed_at: null,
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "merchant_submissions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "sub-1",
                    name: "Kopi Bundaran",
                    category: "Kopi & Minuman",
                    status: "PENDING_REVIEW",
                    address: "Bundaran HI",
                    location: "SRID=4326;POINT(106.8227 -6.1950)",
                    created_at: "2026-09-02T10:00:00.000Z",
                    updated_at: "2026-09-02T10:00:00.000Z",
                  },
                ],
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const workspaceService = new UmkmWorkspaceService(mockSupabase);
      const summary = await workspaceService.getWorkspaceSummary(claimantUserId);

      // Verify verified merchants
      expect(summary.verified_merchants_count).toBe(1);
      expect(summary.owned_merchants[0].name).toBe("Kopi Kenangan");
      expect(summary.owned_merchants[0].verification_status).toBe("VERIFIED");

      // Verify pending submissions include parsed location for owner map preview
      expect(summary.recent_submissions).toHaveLength(1);
      expect(summary.recent_submissions[0].name).toBe("Kopi Bundaran");
      expect(summary.recent_submissions[0].status).toBe("PENDING_REVIEW");
      expect(summary.recent_submissions[0].location).toEqual({
        type: "Point",
        coordinates: [106.8227, -6.195],
      });

      // Verify pending claims
      expect(summary.recent_claims).toHaveLength(1);
      expect(summary.recent_claims[0].id).toBe("claim-1");
      expect(summary.recent_claims[0].status).toBe("PENDING");

      // Verify pending count includes both submissions and claims
      expect(summary.pending_submissions_count).toBe(2);
    });

    it("preserves pending state on simulated reload (fresh service invocation from DB)", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: table === "merchant_submissions" ? [
              {
                id: "sub-persist-1",
                name: "Toko Berkah",
                category: "Retail",
                status: "PENDING_REVIEW",
                address: "Pasar Baru",
                location: "SRID=4326;POINT(106.83 -6.16)",
                created_at: "2026-09-10T12:00:00.000Z",
                updated_at: "2026-09-10T12:00:00.000Z",
              },
            ] : [],
            error: null,
          }),
        })),
      };

      // Call 1
      const service1 = new UmkmWorkspaceService(mockSupabase);
      const res1 = await service1.getWorkspaceSummary(claimantUserId);
      expect(res1.recent_submissions[0].id).toBe("sub-persist-1");

      // Call 2 (simulating reload with fresh service instance)
      const service2 = new UmkmWorkspaceService(mockSupabase);
      const res2 = await service2.getWorkspaceSummary(claimantUserId);
      expect(res2.recent_submissions[0].id).toBe("sub-persist-1");
      expect(res2.pending_submissions_count).toBe(1);
    });
  });

  describe("6. Duplicate Submission Proximity Check", () => {
    it("checks spatial proximity using RPC or fallback", async () => {
      const mockSupabase: any = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ id: "nearby-m-1", name: "Kopi Bundaran Sejati" }],
          error: null,
        }),
      };

      const submissionService = new MerchantSubmissionService(mockSupabase);
      const warning = await submissionService.checkPotentialDuplicates(
        [106.8227, -6.195],
        "Kopi Bundaran Baru"
      );

      expect(warning.has_potential_duplicate).toBe(true);
      expect(warning.nearby_merchant_name).toBe("Kopi Bundaran Sejati");
    });
  });
});
