import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import React from "react";
import { SubmissionSummary } from "@/src/features/umkm-workspace/components/submission-summary";
import type {
  SubmissionBrief,
  MerchantClaimBrief,
} from "@/src/features/umkm-workspace/types/umkm-workspace.types";

describe("Phase 16C — Frontend Admin Review & Owner State Transitions", () => {
  const approvedSubmission: SubmissionBrief = {
    id: "sub-16c-approved-001",
    name: "Kopi Bundaran Sejati",
    category: "Makanan & Minuman",
    status: "APPROVED",
    address: "Bundaran HI, Jakarta Pusat",
    location: {
      type: "Point",
      coordinates: [106.8227, -6.195],
    },
    created_at: "2026-09-02T10:00:00.000Z",
    updated_at: "2026-09-02T11:00:00.000Z",
    review_note: "Disetujui oleh admin.",
  };

  const rejectedSubmission: SubmissionBrief = {
    id: "sub-16c-rejected-002",
    name: "Kopi Palsu",
    category: "Makanan & Minuman",
    status: "REJECTED",
    address: "Jl. Sudirman No. 99",
    location: {
      type: "Point",
      coordinates: [106.82, -6.2],
    },
    created_at: "2026-09-02T10:00:00.000Z",
    updated_at: "2026-09-02T12:00:00.000Z",
    review_note: "Dokumen pendaftaran tidak sesuai dengan lokasi usaha sebenarnya.",
  };

  const approvedClaim: MerchantClaimBrief = {
    id: "claim-16c-approved-001",
    merchant_id: "merchant-canonical-777",
    merchant_name: "Bakso Pak Jaya",
    category: "Makanan & Minuman",
    status: "APPROVED",
    address: "Jl. Sabang No. 45",
    note: "Klaim disetujui setelah verifikasi KTP dan NIB.",
    created_at: "2026-09-03T11:00:00.000Z",
    reviewed_at: "2026-09-03T12:00:00.000Z",
  };

  const rejectedClaim: MerchantClaimBrief = {
    id: "claim-16c-rejected-002",
    merchant_id: "merchant-canonical-888",
    merchant_name: "Soto Betawi Bang Ali",
    category: "Makanan & Minuman",
    status: "REJECTED",
    address: "Jl. Sabang No. 50",
    note: "Klaim ditolak karena bukti kepemilikan tidak valid.",
    created_at: "2026-09-03T11:00:00.000Z",
    reviewed_at: "2026-09-03T13:00:00.000Z",
  };

  describe("1. Approved Owner Submission Presentation", () => {
    it("renders 'Usaha terverifikasi' and hides owner-pending-map-preview upon approval", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[approvedSubmission]} claims={[]} />
      );

      // Section 28: Moves to verified state
      expect(html).toContain("Kopi Bundaran Sejati");
      expect(html).toContain("Usaha terverifikasi");
      expect(html).toContain("Usaha telah berhasil diverifikasi.");

      // Section 17: Pending preview must transition / be hidden so owner does not see duplicate markers
      expect(html).not.toContain('data-testid="owner-pending-map-preview"');
      expect(html).not.toContain("Belum Publik");
    });
  });

  describe("2. Approved Claim Presentation", () => {
    it("renders 'Usaha terverifikasi' for approved claim", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[]} claims={[approvedClaim]} />
      );

      expect(html).toContain("Bakso Pak Jaya");
      expect(html).toContain("Usaha terverifikasi");
      expect(html).toContain("Usaha telah berhasil diverifikasi.");
    });
  });

  describe("3. Truthful Rejection Presentation", () => {
    it("renders 'Pendaftaran tidak disetujui' and displays rejection note for rejected submission", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[rejectedSubmission]} claims={[]} />
      );

      // Section 25 & 29: Truthful human-readable state
      expect(html).toContain("Kopi Palsu");
      expect(html).toContain("Pendaftaran tidak disetujui");
      expect(html).toContain("Pendaftaran usaha tidak dapat disetujui.");
      expect(html).toContain("Dokumen pendaftaran tidak sesuai dengan lokasi usaha sebenarnya.");
      expect(html).toContain("Lihat Alasan");
    });

    it("renders 'Claim tidak disetujui' and displays rejection note for rejected claim", () => {
      const html = renderToStaticMarkup(
        <SubmissionSummary submissions={[]} claims={[rejectedClaim]} />
      );

      // Section 24 & 29: Truthful human-readable state
      expect(html).toContain("Soto Betawi Bang Ali");
      expect(html).toContain("Claim tidak disetujui");
      expect(html).toContain("Permintaan klaim kepemilikan tidak disetujui admin.");
      expect(html).toContain("Klaim ditolak karena bukti kepemilikan tidak valid.");
      expect(html).toContain("Lihat Alasan");
    });
  });
});
