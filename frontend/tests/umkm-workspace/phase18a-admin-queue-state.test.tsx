import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/umkm",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { AdminUmkmView } from "@/src/features/umkm-workspace/components/admin-umkm-view";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission";

describe("Phase 18A — Admin UMKM Review Queue State & Recovery", () => {
  const sampleSubmission: MerchantSubmissionRecord = {
    id: "32b31824-b119-4157-9bae-59a457cc6214",
    submitted_by: "cb0d10dc-a616-4e9b-8070-258b250f2a3a",
    name: "Kopi Transit Juanda",
    category: "Makanan & Minuman",
    description: "Kopi Seduh Segar di Dekat Stasiun Juanda",
    address: "Jl. Ir. H. Juanda No. 12, Gambir",
    location: {
      type: "Point",
      coordinates: [106.829, -6.166],
    },
    opening_hours: {},
    public_media: { menu_urls: [], product_urls: [] },
    business_info: { payment_methods: [] },
    image_url: null,
    status: "PENDING_REVIEW",
    canonical_merchant_id: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    created_at: "2026-08-24T09:43:28.067Z",
    updated_at: "2026-08-24T09:43:28.067Z",
  };

  describe("1. Security & Role Guard", () => {
    it("denies access to regular USER and displays requirement banner", () => {
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={false}
          loading={false}
          error={null}
          claims={[]}
          submissions={[]}
        />
      );

      expect(html).toContain("Akses admin dibutuhkan");
      expect(html).toContain("Halaman pemeriksaan UMKM hanya tersedia untuk akun admin.");
      expect(html).not.toContain("Antrean pemeriksaan UMKM");
    });
  });

  describe("2. Legitimate Empty Queue (State A)", () => {
    it("renders zero counters and truthful empty state without error banner when no items exist", () => {
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={true}
          loading={false}
          error={null}
          claims={[]}
          submissions={[]}
        />
      );

      expect(html).toContain('data-testid="queue-empty-state"');
      expect(html).toContain("Tidak ada pemeriksaan UMKM aktif.");
      expect(html).toContain("Klaim dan pendaftaran baru akan muncul di sini.");
      expect(html).not.toContain('role="alert"');
      expect(html).not.toContain('data-testid="queue-error-state"');
    });
  });

  describe("3. Valid Non-Empty Queue", () => {
    it("renders pending submission with parsed location and updates counters", () => {
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={true}
          loading={false}
          error={null}
          claims={[]}
          submissions={[sampleSubmission]}
        />
      );

      expect(html).toContain("Kopi Transit Juanda");
      expect(html).toContain("Pendaftaran usaha baru");
      expect(html).toContain("Jl. Ir. H. Juanda No. 12, Gambir");
      expect(html).not.toContain('role="alert"');
      expect(html).not.toContain('data-testid="queue-empty-state"');
      expect(html).not.toContain('data-testid="queue-error-state"');
    });
  });

  describe("4. Service Failure & Error State (State B)", () => {
    it("distinguishes service failure from empty queue and displays error state with retry", () => {
      const errorMsg = "Layanan sedang bermasalah. Coba lagi sebentar lagi.";
      const html = renderToStaticMarkup(
        <AdminUmkmView
          isAdmin={true}
          loading={false}
          error={errorMsg}
          claims={[]}
          submissions={[]}
        />
      );

      // Does NOT falsely claim queue is empty
      expect(html).not.toContain('data-testid="queue-empty-state"');
      expect(html).not.toContain("Tidak ada pemeriksaan UMKM aktif.");

      // Displays error alert and retry button
      expect(html).toContain('role="alert"');
      expect(html).toContain(errorMsg);
      expect(html).toContain('data-testid="queue-error-state"');
      expect(html).toContain("Antrean pemeriksaan belum dapat dimuat");
      expect(html).toContain("Coba lagi");
      // Metric counters show dash placeholder
      expect(html).toContain("—");
    });
  });
});
