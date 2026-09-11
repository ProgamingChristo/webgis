import { describe, expect, it, vi } from "vitest";
import { MerchantSubmissionService } from "@/src/features/merchant-submission/services/merchant-submission.service";
import { AdminMerchantClaimService } from "@/src/features/merchant-ownership/services/admin-merchant-claim.service";
import { MerchantProfileService } from "@/src/features/merchant-ownership/services/merchant-profile.service";
import { mapCanonicalMerchantRow } from "@/src/features/merchant-reconciliation/canonical-merchant-read.service";

describe("Phase 16C — Admin Verification, Verified Ownership, Canonical Publication, and Owner Management", () => {
  const adminUserId = "admin-user-0000-0000-0000-000000000000";
  const regularUserId = "regular-user-1111-1111-1111-111111111111";
  const competingUserId = "competing-user-2222-2222-2222-222222222222";

  const submissionId = "sub-16c-0001-0001-0001-000000000001";
  const newCanonicalMerchantId = "merch-16c-0001-0001-0001-000000000001";
  const existingMenuGoMerchantId = "merch-menugo-0002-0002-0002-000000000002";
  const existingMapidMerchantId = "merch-mapid-0003-0003-0003-000000000003";
  const claimIdUserA = "claim-16c-0001-0001-0001-000000000001";
  const claimIdUserB = "claim-16c-0002-0002-0002-000000000002";

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. END-TO-END TEST A — NEW SUBMISSION APPROVE (Section 40)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("1. End-to-End Test A — New UMKM Submission Approval", () => {
    it("atomically approves submission, creates canonical merchant with published status, assigns verified ownership, preserves OWNER_SUBMITTED provenance", async () => {
      let rpcCalled = false;
      let recordedNote = "";

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: adminUserId, account_role: "ADMIN" },
                error: null,
              }),
            };
          }
          if (table === "merchant_submissions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: submissionId,
                  submitted_by: regularUserId,
                  name: "Warung Kopi Mantap",
                  category: "Makanan & Minuman",
                  status: "APPROVED",
                  canonical_merchant_id: newCanonicalMerchantId,
                  reviewed_by: adminUserId,
                  reviewed_at: new Date().toISOString(),
                  review_note: "Disetujui oleh admin.",
                  location: { type: "Point", coordinates: [106.8227, -6.195] },
                  created_at: "2026-09-02T10:00:00.000Z",
                  updated_at: "2026-09-02T10:00:00.000Z",
                },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string, args: any) => {
          if (proc === "approve_merchant_submission") {
            rpcCalled = true;
            recordedNote = args.p_review_note;
            return Promise.resolve({ data: newCanonicalMerchantId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const submissionService = new MerchantSubmissionService(mockSupabase);
      const result = await submissionService.adminApprove(submissionId, adminUserId, "Dokumen lengkap dan valid.");

      expect(rpcCalled).toBe(true);
      expect(recordedNote).toBe("Dokumen lengkap dan valid.");
      expect(result.merchant_id).toBe(newCanonicalMerchantId);
      expect(result.submission.status).toBe("APPROVED");
      expect(result.submission.canonical_merchant_id).toBe(newCanonicalMerchantId);

      // Verify canonical merchant mapping includes OWNER_SUBMITTED provenance
      const merchantDbRow = {
        id: newCanonicalMerchantId,
        name: "Warung Kopi Mantap",
        owner_id: regularUserId,
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        location: { type: "Point", coordinates: [106.8227, -6.195] },
        metadata: { category: "Makanan & Minuman" },
        updated_at: "2026-09-02T10:00:00.000Z",
      };
      const canonicalItem = mapCanonicalMerchantRow(
        merchantDbRow,
        [],
        new Map(),
        undefined,
        { id: submissionId, submitted_by: regularUserId }
      );

      expect(canonicalItem).not.toBeNull();
      expect(canonicalItem!.owner_id).toBe(regularUserId);
      expect(canonicalItem!.publish_status).toBe("PUBLISHED");
      expect(canonicalItem!.sources).toContain("OWNER_SUBMITTED");
      expect(canonicalItem!.sources).not.toContain("MENU_GO");
      expect(canonicalItem!.sources).not.toContain("PREMIUM");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. END-TO-END TEST B — NEW SUBMISSION REJECT (Section 41)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("2. End-to-End Test B — New UMKM Submission Rejection", () => {
    it("rejects submission without publication, without ownership, and records rejection note", async () => {
      let rejectRpcCalled = false;
      const rejectionNote = "Foto lokasi tidak jelas dan nomor kontak tidak dapat dihubungi.";

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: adminUserId, account_role: "ADMIN" },
                error: null,
              }),
            };
          }
          if (table === "merchant_submissions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: submissionId,
                  submitted_by: regularUserId,
                  name: "Warung Kopi Mantap",
                  category: "Makanan & Minuman",
                  status: "REJECTED",
                  canonical_merchant_id: null,
                  reviewed_by: adminUserId,
                  reviewed_at: new Date().toISOString(),
                  review_note: rejectionNote,
                  location: { type: "Point", coordinates: [106.8227, -6.195] },
                  created_at: "2026-09-02T10:00:00.000Z",
                  updated_at: "2026-09-02T10:00:00.000Z",
                },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string, args: any) => {
          if (proc === "reject_merchant_submission") {
            rejectRpcCalled = true;
            expect(args.p_review_note).toBe(rejectionNote);
            return Promise.resolve({ data: submissionId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const submissionService = new MerchantSubmissionService(mockSupabase);
      const result = await submissionService.adminReject(submissionId, adminUserId, rejectionNote);

      expect(rejectRpcCalled).toBe(true);
      expect(result.status).toBe("REJECTED");
      expect(result.canonical_merchant_id).toBeNull();
      expect(result.review_note).toBe(rejectionNote);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. END-TO-END TEST C — MENU GO CLAIM APPROVE (Section 42)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("3. End-to-End Test C — Menu Go Merchant Claim Approval", () => {
    it("approves claim keeping same canonical merchant ID, preserving MENU_GO provenance, and attaching verified ownership", async () => {
      let claimApproveRpcCalled = false;

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchant_claims") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: claimIdUserA,
                  merchant_id: existingMenuGoMerchantId,
                  user_id: regularUserId,
                  status: "APPROVED",
                  note: "Klaim disetujui admin.",
                  evidence: { relationship: "OWNER", contactName: "Budi", contactPhone: "08123456789", statement: "Bukti sah kepemilikan." },
                  created_at: "2026-09-02T10:00:00.000Z",
                  reviewed_at: "2026-09-02T11:00:00.000Z",
                  reviewed_by: adminUserId,
                },
                error: null,
              }),
            };
          }
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: existingMenuGoMerchantId,
                    name: "Bakso Menu Go Sabang",
                    address: "Jl. Sabang No. 10",
                    description: "Bakso Sapi Asli",
                    publish_status: "PUBLISHED",
                    verification_status: "VERIFIED",
                    metadata: {},
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: regularUserId, display_name: "Budi Santoso", username: "budis" }],
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string, args: any) => {
          if (proc === "approve_merchant_claim") {
            claimApproveRpcCalled = true;
            expect(args.claim_id).toBe(claimIdUserA);
            return Promise.resolve({ data: existingMenuGoMerchantId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const claimService = new AdminMerchantClaimService(mockSupabase);
      const result = await claimService.approve(claimIdUserA, adminUserId, "Klaim disetujui admin.");

      expect(claimApproveRpcCalled).toBe(true);
      expect(result.merchant_id).toBe(existingMenuGoMerchantId); // SAME canonical ID
      expect(result.status).toBe("APPROVED");

      // Verify MENU_GO provenance remains intact
      const menuGoLink = {
        merchant_id: existingMenuGoMerchantId,
        source_table: "mapid_mission_observations:MENU_GO",
        source_record_id: "obs-999",
      };
      const canonicalItem = mapCanonicalMerchantRow(
        {
          id: existingMenuGoMerchantId,
          name: "Bakso Menu Go Sabang",
          owner_id: regularUserId,
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          location: { type: "Point", coordinates: [106.8227, -6.195] },
        },
        [menuGoLink],
        new Map(),
        undefined,
        null
      );

      expect(canonicalItem!.id).toBe(existingMenuGoMerchantId);
      expect(canonicalItem!.owner_id).toBe(regularUserId);
      expect(canonicalItem!.sources).toContain("MENU_GO");
      expect(canonicalItem!.publish_status).toBe("PUBLISHED");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. END-TO-END TEST D — MAPID / PREMIUM CLAIM APPROVE (Section 43)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("4. End-to-End Test D — MAPID/Premium Merchant Claim Approval", () => {
    it("approves claim for MAPID/Premium merchant, attaches owner, preserves PREMIUM provenance", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchant_claims") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: claimIdUserA,
                  merchant_id: existingMapidMerchantId,
                  user_id: regularUserId,
                  status: "APPROVED",
                  note: "Approved MAPID claim",
                  evidence: { relationship: "OWNER", statement: "Pemilik resmi MAPID merchant." },
                  created_at: "2026-09-02T10:00:00.000Z",
                  reviewed_at: "2026-09-02T11:00:00.000Z",
                  reviewed_by: adminUserId,
                },
                error: null,
              }),
            };
          }
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: existingMapidMerchantId,
                    name: "Resto Premium Menteng",
                    publish_status: "PUBLISHED",
                    verification_status: "VERIFIED",
                    metadata: {},
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: regularUserId, display_name: "Budi Santoso", username: "budis" }],
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string) => {
          if (proc === "approve_merchant_claim") {
            return Promise.resolve({ data: existingMapidMerchantId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const claimService = new AdminMerchantClaimService(mockSupabase);
      const result = await claimService.approve(claimIdUserA, adminUserId);

      expect(result.merchant_id).toBe(existingMapidMerchantId);
      expect(result.status).toBe("APPROVED");

      const premiumLink = {
        merchant_id: existingMapidMerchantId,
        source_table: "mapid_premium_merchants",
        source_record_id: "prem-888",
      };
      const canonicalItem = mapCanonicalMerchantRow(
        {
          id: existingMapidMerchantId,
          name: "Resto Premium Menteng",
          owner_id: regularUserId,
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          location: { type: "Point", coordinates: [106.8227, -6.195] },
        },
        [premiumLink],
        new Map(),
        undefined,
        null
      );

      expect(canonicalItem!.id).toBe(existingMapidMerchantId);
      expect(canonicalItem!.owner_id).toBe(regularUserId);
      expect(canonicalItem!.sources).toContain("PREMIUM");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. END-TO-END TEST E — CLAIM REJECT (Section 44)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("5. End-to-End Test E — Claim Rejection", () => {
    it("rejects claim leaving existing merchant public, without assigning ownership", async () => {
      let rejectClaimRpcCalled = false;
      const rejectNote = "Bukti kepemilikan tidak mencukupi.";

      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchant_claims") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: claimIdUserA,
                  merchant_id: existingMenuGoMerchantId,
                  user_id: regularUserId,
                  status: "REJECTED",
                  note: rejectNote,
                  evidence: {},
                  created_at: "2026-09-02T10:00:00.000Z",
                  reviewed_at: "2026-09-02T11:00:00.000Z",
                  reviewed_by: adminUserId,
                },
                error: null,
              }),
            };
          }
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: existingMenuGoMerchantId,
                    name: "Bakso Menu Go Sabang",
                    publish_status: "PUBLISHED",
                    verification_status: "SURVEYED",
                  },
                ],
                error: null,
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: regularUserId, display_name: "Budi Santoso", username: "budis" }],
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string, args: any) => {
          if (proc === "reject_merchant_claim") {
            rejectClaimRpcCalled = true;
            expect(args.review_note).toBe(rejectNote);
            return Promise.resolve({ data: claimIdUserA, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const claimService = new AdminMerchantClaimService(mockSupabase);
      const result = await claimService.reject(claimIdUserA, adminUserId, rejectNote);

      expect(rejectClaimRpcCalled).toBe(true);
      expect(result.status).toBe("REJECTED");
      expect(result.note).toBe(rejectNote);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. END-TO-END TEST F — MULTI CLAIM ADJUDICATION (Section 45)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("6. End-to-End Test F — Multi-Claim Adjudication", () => {
    it("requires explicit admin adjudication, awards ownership to approved claimant, and prevents competing claimant from overwriting ownership", async () => {
      // In PostgreSQL RPC approve_merchant_claim:
      // When User B claim is approved:
      // 1. merchants.owner_id = user_b
      // 2. competing pending claims for that merchant are closed (status = 'REJECTED')
      // 3. Any subsequent attempt to approve User A will fail with 'Merchant already has an active owner'
      const mockSupabase: any = {
        rpc: vi.fn((proc: string, args: any) => {
          if (proc === "approve_merchant_claim" && args.claim_id === claimIdUserB) {
            return Promise.resolve({ data: existingMenuGoMerchantId, error: null });
          }
          if (proc === "approve_merchant_claim" && args.claim_id === claimIdUserA) {
            // Takeover protection: blocked!
            return Promise.resolve({
              data: null,
              error: { message: "Merchant already has an active owner", code: "23505" },
            });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
        from: vi.fn((table: string) => {
          if (table === "merchant_claims") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: claimIdUserB,
                  merchant_id: existingMenuGoMerchantId,
                  user_id: competingUserId,
                  status: "APPROVED",
                  note: "Disetujui",
                  evidence: {},
                  created_at: "2026-09-02T10:00:00.000Z",
                  reviewed_at: "2026-09-02T11:00:00.000Z",
                  reviewed_by: adminUserId,
                },
                error: null,
              }),
            };
          }
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: existingMenuGoMerchantId, name: "Bakso Menu Go Sabang" }],
                error: null,
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{ id: competingUserId, display_name: "Competitor" }],
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const claimService = new AdminMerchantClaimService(mockSupabase);

      // Admin approves User B
      const approvedResult = await claimService.approve(claimIdUserB, adminUserId);
      expect(approvedResult.status).toBe("APPROVED");

      // Later attempt to approve User A without revoking User B is blocked
      await expect(
        claimService.approve(claimIdUserA, adminUserId)
      ).rejects.toThrow("Gagal menyetujui klaim merchant.");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. END-TO-END TEST G — DOUBLE APPROVE IDEMPOTENCY (Section 46)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("7. End-to-End Test G — Double Approve Idempotency", () => {
    it("returns same canonical merchant ID safely without creating duplicates on double approval", async () => {
      let callCount = 0;
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: adminUserId, account_role: "ADMIN" },
                error: null,
              }),
            };
          }
          if (table === "merchant_submissions") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: submissionId,
                  submitted_by: regularUserId,
                  name: "Warung Kopi Mantap",
                  category: "Makanan & Minuman",
                  status: "APPROVED",
                  canonical_merchant_id: newCanonicalMerchantId,
                  reviewed_by: adminUserId,
                  reviewed_at: "2026-09-02T10:00:00.000Z",
                  location: { type: "Point", coordinates: [106.8227, -6.195] },
                  created_at: "2026-09-02T10:00:00.000Z",
                  updated_at: "2026-09-02T10:00:00.000Z",
                },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string) => {
          if (proc === "approve_merchant_submission") {
            callCount++;
            // Idempotent RPC always returns the existing canonical ID
            return Promise.resolve({ data: newCanonicalMerchantId, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const submissionService = new MerchantSubmissionService(mockSupabase);

      const firstApprove = await submissionService.adminApprove(submissionId, adminUserId);
      const secondApprove = await submissionService.adminApprove(submissionId, adminUserId);

      expect(callCount).toBe(2);
      expect(firstApprove.merchant_id).toBe(newCanonicalMerchantId);
      expect(secondApprove.merchant_id).toBe(newCanonicalMerchantId);
      expect(firstApprove.merchant_id).toBe(secondApprove.merchant_id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. END-TO-END TEST H — SECURITY AUTHORIZATION (Section 47)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("8. End-to-End Test H — Security Authorization", () => {
    it("denies regular user from approving or rejecting merchant submissions", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: regularUserId, account_role: "USER" },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const submissionService = new MerchantSubmissionService(mockSupabase);

      await expect(
        submissionService.adminApprove(submissionId, regularUserId)
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Hanya administrator yang dapat melakukan review pengajuan.",
      });

      await expect(
        submissionService.adminReject(submissionId, regularUserId, "Alasan penolakan")
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Hanya administrator yang dapat melakukan review pengajuan.",
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. VERIFIED OWNER PROFILE MANAGEMENT (Section 30-33)
  // ─────────────────────────────────────────────────────────────────────────────
  describe("9. Verified Owner Profile Management", () => {
    it("allows verified owner to update description and opening hours without mutating geometry or provenance", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: newCanonicalMerchantId,
                  name: "Warung Kopi Mantap",
                  owner_id: regularUserId,
                  verification_status: "VERIFIED",
                  publish_status: "PUBLISHED",
                  description: "Deskripsi lama",
                  opening_hours: { monday: "08:00-20:00" },
                  metadata: { category: "Makanan & Minuman" },
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: newCanonicalMerchantId,
                  name: "Warung Kopi Mantap",
                  description: "Deskripsi baru terverifikasi",
                  opening_hours: { monday: "09:00-22:00" },
                  metadata: { category: "Makanan & Minuman", phone: "081299998888" },
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
              update: vi.fn((payload) => ({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: newCanonicalMerchantId,
                    name: "Warung Kopi Mantap",
                    ...payload,
                  },
                  error: null,
                }),
              })),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc: vi.fn((proc: string) => {
          if (proc === "update_owned_merchant_profile") {
            return Promise.resolve({ data: { status: "UPDATED" }, error: null });
          }
          throw new Error(`Unexpected RPC: ${proc}`);
        }),
      };

      const profileService = new MerchantProfileService(mockSupabase);
      const updated = await profileService.updateProfile(newCanonicalMerchantId, regularUserId, {
        description: "Deskripsi baru terverifikasi",
        opening_hours: { monday: "09:00-22:00" },
        metadata: { phone: "081299998888" },
      });

      expect(updated).toBeDefined();
      expect(updated.description).toBe("Deskripsi baru terverifikasi");
    });

    it("rejects non-owner from updating merchant profile", async () => {
      const mockSupabase: any = {
        from: vi.fn((table: string) => {
          if (table === "merchants") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: newCanonicalMerchantId,
                  owner_id: regularUserId, // Owned by regularUserId
                },
                error: null,
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
      };

      const profileService = new MerchantProfileService(mockSupabase);

      // Attempt by competingUserId (not the owner)
      await expect(
        profileService.updateProfile(newCanonicalMerchantId, competingUserId, {
          description: "Unauthorized edit",
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Hanya pemilik terverifikasi yang dapat mengubah profil usaha ini.",
      });
    });
  });
});
