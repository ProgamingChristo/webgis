import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import React from "react";
import { SubmissionSummary } from "@/src/features/umkm-workspace/components/submission-summary";
import { UmkmPendingState } from "@/src/features/umkm-workspace/components/umkm-pending-state";
import type { UmkmWorkspaceSummary } from "@/src/features/umkm-workspace/types/umkm-workspace.types";

describe("Phase 16B — Frontend UMKM Ownership, Claim, and Pending States", () => {
  const pendingSubmission = {
    id: "sub-16b-001",
    name: "Kopi Bundaran Sejati",
    category: "Kopi & Minuman Ringan",
    status: "PENDING_REVIEW" as const,
    address: "Bundaran HI, Jakarta Pusat",
    location: {
      type: "Point" as const,
      coordinates: [106.8227, -6.195] as [number, number],
    },
    created_at: "2026-09-02T10:00:00.000Z",
    updated_at: "2026-09-02T10:00:00.000Z",
  };

  const pendingClaim = {
    id: "claim-16b-002",
    merchant_id: "merchant-canonical-777",
    merchant_name: "Bakso Pak Jaya",
    category: "Makanan & Minuman",
    status: "PENDING" as const,
    address: "Jl. Sabang No. 45",
    note: null,
    created_at: "2026-09-03T11:00:00.000Z",
    reviewed_at: null,
  };

  describe("1. Submission Pending Card", () => {
    it("renders human-readable copy 'Menunggu verifikasi' and descriptive explanation", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[pendingSubmission]} claims={[]} />
      );

      // Status badge and name
      expect(html).toContain("Kopi Bundaran Sejati");
      expect(html).toContain("Menunggu verifikasi");
      // Human-readable Indonesian description (Section 11)
      expect(html).toContain("Usaha Anda sudah diajukan dan sedang ditinjau GETRA.");
      // Action CTA (Section 12 & 27)
      expect(html).toContain("Lihat Status");
      expect(html).toContain('href="/umkm/submissions/sub-16b-001"');
      // No raw enum
      expect(html).not.toContain("PENDING_REVIEW");
      expect(html).not.toContain("SUBMISSION_PENDING");
    });

    it("renders owner-only pending map preview with coordinates", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[pendingSubmission]} claims={[]} />
      );

      // Section 9: Owner-only pending map preview
      expect(html).toContain('data-testid="owner-pending-map-preview"');
      expect(html).toContain("Pratinjau Lokasi (Hanya Pemilik)");
      expect(html).toContain("Belum Publik");
      expect(html).toContain("-6.195000");
      expect(html).toContain("106.822700");
      expect(html).toContain("Marker ini hanya terlihat di ruang kelola Anda");
    });
  });

  describe("2. Claim Pending Card", () => {
    it("renders human-readable copy 'Claim sedang diperiksa' and descriptive explanation", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[]} claims={[pendingClaim]} />
      );

      // Status badge and name
      expect(html).toContain("Bakso Pak Jaya");
      expect(html).toContain("Claim sedang diperiksa");
      // Human-readable Indonesian description (Section 16)
      expect(html).toContain("Permintaan kepemilikan Anda sedang ditinjau GETRA.");
      // Action CTA (Section 27)
      expect(html).toContain("Lihat Status");
      expect(html).toContain('href="/umkm/claims/claim-16b-002"');
      // No raw enum
      expect(html).not.toContain("CLAIM_PENDING");
    });
  });

  describe("3. Owner Workspace Integration", () => {
    it("renders pending state with both submissions and claims without promotion CTA", () => {
      const summary: UmkmWorkspaceSummary = {
        verified_merchants_count: 0,
        pending_submissions_count: 2,
        active_campaigns_count: 0,
        owned_merchants: [],
        recent_submissions: [pendingSubmission],
        recent_claims: [pendingClaim],
      };

      const html = renderToStaticMarkup(<UmkmPendingState summary={summary} />);

      expect(html).toContain("Pengajuan Anda sedang diperiksa");
      expect(html).toContain("Kopi Bundaran Sejati");
      expect(html).toContain("Bakso Pak Jaya");
      // Promotion authority: NO in pending state (Section 29)
      expect(html).not.toContain("Buat Kampanye");
      expect(html).not.toContain("Aktifkan Promosi");
    });
  });

  describe("4. Public Merchant Card — Claim CTA & Verified State", () => {
    it("exposes 'Klaim Usaha Ini' CTA for unowned merchants and verified message for owned merchants in dashboard", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const dashboardPath = path.resolve(__dirname, "../../components/getra-dashboard.tsx");
      const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");

      // Claim CTA when merchant is unowned
      expect(dashboardCode).toContain('data-testid="merchant-claim-cta"');
      expect(dashboardCode).toContain("Klaim Usaha Ini");
      expect(dashboardCode).toContain("claimMerchantId");
      expect(dashboardCode).toContain("mode=claim");

      // Verified owner badge when merchant already has owner
      expect(dashboardCode).toContain('data-testid="merchant-verified-badge"');
      expect(dashboardCode).toContain("Usaha ini sudah memiliki pengelola terverifikasi.");
    });
  });
});
