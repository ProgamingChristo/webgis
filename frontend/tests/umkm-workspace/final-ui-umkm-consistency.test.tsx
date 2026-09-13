import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/umkm",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/src/features/merchant-submission/services/merchant-submission.service", () => ({
  MerchantSubmissionService: {
    getSubmission: vi.fn(),
    cancelSubmission: vi.fn(),
  },
}));

import { AdminUmkmView } from "@/src/features/umkm-workspace/components/admin-umkm-view";
import { MerchantSubmissionDetail } from "@/src/features/merchant-submission/components/merchant-submission-detail";
import { MerchantSubmissionService } from "@/src/features/merchant-submission/services/merchant-submission.service";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission";

describe("Final UI UMKM Consistency & Reliability Regression", () => {
  const fullSubmissionFixture: MerchantSubmissionRecord = {
    id: "f331dd3a-f989-4214-b402-ff087d5700eb",
    submitted_by: "41c1a67e-3e36-45c0-8fe5-e57d2b0d0346",
    name: "Kedai Kopi Nusantara Mandiri",
    category: "Kedai Kopi",
    description:
      "Kopi susu aren dan roti bakar premium dibuat segar setiap pagi.\n\n[Jenis Usaha: Keliling] [Menu Andalan: Kopi Susu Aren Spesial] [Fasilitas: Tempat Duduk, Take Away, Wi-Fi] [Instagram: @kopinusantara.id] [Catatan: Gerobak modern di trotoar legal rasuna]",
    address: "Jl. H. R. Rasuna Said, Kuningan, Jakarta Selatan",
    location: {
      type: "Point",
      coordinates: [106.8306, -6.2216],
    },
    opening_hours: {
      monday: { is_closed: false, opens_at: "07:30", closes_at: "20:00" },
      tuesday: { is_closed: false, opens_at: "07:30", closes_at: "20:00" },
      wednesday: { is_closed: false, opens_at: "07:30", closes_at: "20:00" },
      thursday: { is_closed: false, opens_at: "07:30", closes_at: "20:00" },
      friday: { is_closed: false, opens_at: "07:30", closes_at: "20:00" },
      saturday: { is_closed: false, opens_at: "07:30", closes_at: "20:00" },
      sunday: { is_closed: true, opens_at: null, closes_at: null },
    },
    public_media: {
      menu_urls: ["https://example.com/menu1.jpg"],
      product_urls: [],
    },
    business_info: {
      contact_phone: "081234567890",
      price_range: "STANDARD",
      payment_methods: ["CASH", "QRIS"],
    },
    image_url: "https://example.com/storefront.jpg",
    status: "PENDING_REVIEW",
    canonical_merchant_id: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    created_at: "2026-09-13T10:00:00.000Z",
    updated_at: "2026-09-13T10:00:00.000Z",
  };

  describe("1. Pending UMKM Page — Field Parity & Light Design", () => {
    it("faithfully renders all submitted form data without omitting fields or inventing data", async () => {
      vi.mocked(MerchantSubmissionService.getSubmission).mockResolvedValue(fullSubmissionFixture);

      // Render detail view
      const html = renderToStaticMarkup(
        <MerchantSubmissionDetail
          submissionId={fullSubmissionFixture.id}
          initialData={fullSubmissionFixture}
        />
      );

      // Business info parity
      expect(html).toContain("Kedai Kopi Nusantara Mandiri");
      expect(html).toContain("Kedai Kopi");
      expect(html).toContain("Keliling");
      expect(html).toContain("Kopi Susu Aren Spesial");
      expect(html).toContain("Standar");
      expect(html).toContain("Kopi susu aren dan roti bakar premium");

      // Location & address parity
      expect(html).toContain("Jl. H. R. Rasuna Said, Kuningan, Jakarta Selatan");
      expect(html).toContain("106.8306");
      expect(html).toContain("-6.2216");

      // Operations parity
      expect(html).toContain("Senin");
      expect(html).toContain("07:30 - 20:00");
      expect(html).toContain("Minggu");
      expect(html).toContain("Tutup");
      expect(html).toContain("Tunai");
      expect(html).toContain("QRIS");
      expect(html).toContain("Tempat Duduk");
      expect(html).toContain("Take Away");
      expect(html).toContain("Wi-Fi");

      // Contact & notes parity
      expect(html).toContain("081234567890");
      expect(html).toContain("@kopinusantara.id");
      expect(html).toContain("Gerobak modern di trotoar legal rasuna");

      // Light design container
      expect(html).toContain("data-testid=\"merchant-submission-detail-container\"");
      expect(html).toContain("bg-white");
      expect(html).not.toContain("bg-slate-900");
    });

    it("strictly protects private ownership evidence and never leaks raw evidence to public view", async () => {
      vi.mocked(MerchantSubmissionService.getSubmission).mockResolvedValue(fullSubmissionFixture);

      const html = renderToStaticMarkup(
        <MerchantSubmissionDetail
          submissionId={fullSubmissionFixture.id}
          initialData={fullSubmissionFixture}
        />
      );

      // Safe owner-facing representation
      expect(html).toContain("Dokumen verifikasi telah berhasil diunggah dan disimpan.");
      expect(html).toContain("Privat &amp; Terlindungi");
      expect(html).toContain("Sesuai standar privasi GETRA");

      // Must not expose raw internal paths or private claim URLs
      expect(html).not.toContain("private_evidence_url");
      expect(html).not.toContain("owner_ktp_raw");
    });
  });

  describe("2. Admin UMKM Queue — Error Separation & Reliability", () => {
    it("preserves visible queue items when an action/mutation error occurs, never hiding the queue", () => {
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={true}
          loading={false}
          error={null}
          actionError="Persetujuan usaha gagal diproses: Kendala jaringan."
          claims={[]}
          submissions={[fullSubmissionFixture]}
        />
      );

      // Queue items remain visible
      expect(html).toContain("Kedai Kopi Nusantara Mandiri");
      expect(html).toContain("Pendaftaran usaha baru");

      // Error banner displays as an action alert, not replacing the queue
      expect(html).toContain('role="alert"');
      expect(html).toContain("Persetujuan usaha gagal diproses: Kendala jaringan.");
      expect(html).not.toContain('data-testid="queue-error-state"');
      expect(html).not.toContain('data-testid="queue-empty-state"');
    });

    it("displays success banner when an action completes successfully", () => {
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={true}
          loading={false}
          error={null}
          actionSuccess="&quot;Kedai Kopi Nusantara Mandiri&quot; berhasil disetujui."
          claims={[]}
          submissions={[fullSubmissionFixture]}
        />
      );

      expect(html).toContain("Kedai Kopi Nusantara Mandiri");
      expect(html).toContain("berhasil disetujui.");
      expect(html).not.toContain('role="alert"');
    });

    it("renders light design metrics and cards without dark cyberpunk artifacts", () => {
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={true}
          loading={false}
          error={null}
          claims={[]}
          submissions={[fullSubmissionFixture]}
        />
      );

      // Light design confirmation
      expect(html).toContain("bg-white");
      expect(html).toContain("text-slate-950");
      expect(html).not.toContain("bg-white/[0.04]");
      expect(html).not.toContain("bg-[#050a10]");
    });
  });
});
