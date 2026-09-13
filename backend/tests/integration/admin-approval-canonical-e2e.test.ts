import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/src/lib/supabase/server", () => ({
  getServerSupabaseClient: vi.fn(),
  getRequestSupabaseClient: vi.fn(),
  getServiceRoleSupabaseClient: vi.fn(),
}));

import {
  getServerSupabaseClient,
  getRequestSupabaseClient,
  getServiceRoleSupabaseClient,
} from "@/src/lib/supabase/server";

import { POST as ApprovePOST } from "@/app/api/admin/merchant-submissions/[id]/approve/route";
import { POST as RejectPOST } from "@/app/api/admin/merchant-submissions/[id]/reject/route";
import { MerchantSubmissionRepository } from "@/src/features/merchant-submission/repositories/merchant-submission.repository";

describe("Admin UMKM Approval & Canonical Merchant Integration", () => {
  const adminId = "admin-uuid-1234";
  const regularUserId = "user-uuid-5678";
  const submissionId = "sub-uuid-9999";

  let mockServiceSupabase: any;
  let mockRequestSupabase: any;
  let mockAuthSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockServiceSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    mockRequestSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    mockAuthSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };

    (getServerSupabaseClient as any).mockReturnValue(mockAuthSupabase);
    (getRequestSupabaseClient as any).mockReturnValue(mockRequestSupabase);
    (getServiceRoleSupabaseClient as any).mockReturnValue(mockServiceSupabase);
  });

  describe("Security & Authorization Gates", () => {
    it("should reject approval without Authorization header (401 Unauthorized)", async () => {
      const req = new NextRequest(`http://localhost:8080/api/admin/merchant-submissions/${submissionId}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await ApprovePOST(req, { params: Promise.resolve({ id: submissionId }) });
      expect(res.status).toBe(401);
    });

    it("should reject approval by non-admin user (403 Forbidden)", async () => {
      mockAuthSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: regularUserId } },
        error: null,
      });

      mockRequestSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: regularUserId, account_role: "USER" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:8080/api/admin/merchant-submissions/${submissionId}/approve`, {
        method: "POST",
        headers: { Authorization: "Bearer regular-token" },
        body: JSON.stringify({}),
      });

      const res = await ApprovePOST(req, { params: Promise.resolve({ id: submissionId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("should reject submission rejection by non-admin user (403 Forbidden)", async () => {
      mockAuthSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: regularUserId } },
        error: null,
      });

      mockRequestSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: regularUserId, account_role: "USER" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:8080/api/admin/merchant-submissions/${submissionId}/reject`, {
        method: "POST",
        headers: { Authorization: "Bearer regular-token" },
        body: JSON.stringify({ review_note: "Tidak memenuhi syarat dokumen." }),
      });

      const res = await RejectPOST(req, { params: Promise.resolve({ id: submissionId }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Location Validation on Approval", () => {
    it("should reject approval safely if coordinates are invalid or [0,0]", async () => {
      const repo = new MerchantSubmissionRepository(mockRequestSupabase);

      // Mock finding submission with invalid coordinates [0, 0]
      mockRequestSupabase.from.mockImplementation((table: string) => {
        if (table === "merchant_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: submissionId,
                    name: "Kedai Kopi Invalid",
                    status: "PENDING_REVIEW",
                    category: "Kuliner",
                    location: "POINT(0 0)",
                    submitted_by: regularUserId,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        repo.approveSubmission(submissionId, adminId, "Catatan")
      ).rejects.toThrow("Koordinat lokasi pengajuan di luar batas geografis yang valid.");
    });
  });

  describe("Atomic Approval & Canonical Merchant Publication", () => {
    it("should create canonical merchant with exact submitted coordinates and verified ownership", async () => {
      const repo = new MerchantSubmissionRepository(mockRequestSupabase);

      const submittedLng = 106.8306;
      const submittedLat = -6.2216;
      const canonicalMerchantId = "merchant-canonical-777";

      // 1. Initial submission query returns PENDING_REVIEW
      mockRequestSupabase.from.mockImplementation((table: string) => {
        if (table === "merchant_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: submissionId,
                    name: "Kedai Kopi Kuningan",
                    description: "Kopi mantap",
                    address: "Jl. HR Rasuna Said",
                    status: "PENDING_REVIEW",
                    category: "Kuliner",
                    location: `POINT(${submittedLng} ${submittedLat})`,
                    opening_hours: { monday: { opens_at: "08:00", closes_at: "20:00" } },
                    submitted_by: regularUserId,
                    business_info: { price_range: "Rp 10.000 - 25.000" },
                    public_media: { menu_urls: ["https://example.com/menu.jpg"] },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // 2. RPC throws self-approval or context error -> fallback triggers safely
      mockRequestSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: "42501", message: "Self approval is not allowed" },
      });

      // 3. Mock service client in fallback
      mockServiceSupabase.from.mockImplementation((table: string) => {
        if (table === "merchants") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockImplementation((payload: any) => {
              expect(payload.name).toBe("Kedai Kopi Kuningan");
              expect(payload.address).toBe("Jl. HR Rasuna Said");
              expect(payload.location).toBe(`SRID=4326;POINT(${submittedLng} ${submittedLat})`);
              expect(payload.publish_status).toBe("PUBLISHED");
              expect(payload.verification_status).toBe("VERIFIED");
              expect(payload.owner_id).toBe(regularUserId);
              expect(payload.metadata.submitted_from_id).toBe(submissionId);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: canonicalMerchantId },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        if (table === "merchant_submissions") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: submissionId,
                      name: "Kedai Kopi Kuningan",
                      status: "APPROVED",
                      canonical_merchant_id: canonicalMerchantId,
                      location: `POINT(${submittedLng} ${submittedLat})`,
                      submitted_by: regularUserId,
                      reviewed_by: adminId,
                      reviewed_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "audit_events") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await repo.approveSubmission(submissionId, adminId, "Disetujui admin");
      expect(result.submission.status).toBe("APPROVED");
      expect(result.merchant_id).toBe(canonicalMerchantId);
      expect(result.submission.location.coordinates).toEqual([submittedLng, submittedLat]);
    });

    it("should be idempotent and not create duplicate merchant when approved twice", async () => {
      const repo = new MerchantSubmissionRepository(mockRequestSupabase);
      const canonicalMerchantId = "merchant-canonical-777";

      // Mock finding already-approved submission
      mockRequestSupabase.from.mockImplementation((table: string) => {
        if (table === "merchant_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: submissionId,
                    name: "Kedai Kopi Kuningan",
                    status: "APPROVED",
                    canonical_merchant_id: canonicalMerchantId,
                    location: "POINT(106.8306 -6.2216)",
                    submitted_by: regularUserId,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await repo.approveSubmission(submissionId, adminId, "Disetujui lagi");
      expect(result.submission.status).toBe("APPROVED");
      expect(result.merchant_id).toBe(canonicalMerchantId);
      // Ensure no insert was called
      expect(mockServiceSupabase.from).not.toHaveBeenCalled();
    });
  });
});
