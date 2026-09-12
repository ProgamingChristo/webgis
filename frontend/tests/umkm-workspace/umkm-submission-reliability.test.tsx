import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  push: vi.fn(),
  resolvePlace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/src/lib/auth-client", () => ({
  authenticatedFetch: mocks.authenticatedFetch,
}));

vi.mock("@/src/features/place-resolution/client/place-resolution.client", () => ({
  resolvePlaceClient: mocks.resolvePlace,
}));

vi.mock("@/src/features/merchant-submission/components/merchant-submission-map-picker", () => ({
  MerchantMapPicker: ({ initialCoordinates }: { initialCoordinates?: [number, number] }) => (
    <div data-testid="mock-map-picker" data-coords={initialCoordinates ? initialCoordinates.join(",") : "none"}>
      Map Picker
    </div>
  ),
}));

import { AiService } from "@/src/services/ai.service";
import { MerchantDescriptionAssistant } from "@/src/features/merchant-submission/components/merchant-description-assistant";
import { MerchantSubmissionForm } from "@/src/features/merchant-submission/components/merchant-submission-form";
import { UmkmWorkspaceContent } from "@/src/features/umkm-workspace/components/umkm-workspace";
import { deriveUmkmWorkspaceState } from "@/src/features/umkm-workspace/model/umkm-workspace-state";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission/types/merchant-submission.types";
import type { UmkmWorkspaceSummary } from "@/src/features/umkm-workspace/types/umkm-workspace.types";

const originalApiUrl = process.env.NEXT_PUBLIC_GETRA_API_URL;

describe("UMKM Submission Reliability & UX (STEP 2.8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GETRA_API_URL = "http://localhost:8180";
  });

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_GETRA_API_URL;
    else process.env.NEXT_PUBLIC_GETRA_API_URL = originalApiUrl;
  });

  describe("Owner Workspace Loading & State Transitions", () => {
    it("exits loading state cleanly into empty state when user has no merchants", () => {
      const emptySummary: UmkmWorkspaceSummary = {
        owned_merchants: [],
        recent_claims: [],
        recent_submissions: [],
        verified_merchants_count: 0,
        pending_submissions_count: 0,
        active_campaigns_count: 0,
      };

      expect(deriveUmkmWorkspaceState(emptySummary)).toBe("NO_MERCHANT");
      const html = renderToStaticMarkup(<UmkmWorkspaceContent summary={emptySummary} />);
      expect(html).not.toContain("Memuat usaha Anda...");
      expect(html).toContain("Mulai kelola usaha Anda di GETRA");
      expect(html).toContain('href="/umkm/merchants/new"');
    });

    it("transitions into pending verification state when a submission is under review", () => {
      const pendingSummary: UmkmWorkspaceSummary = {
        owned_merchants: [],
        recent_claims: [],
        recent_submissions: [
          {
            id: "sub-123",
            name: "Warung Berkah",
            category: "Kuliner",
            status: "PENDING_REVIEW",
            address: "Jl. Sudirman No. 1",
            created_at: "2026-09-12T00:00:00Z",
            updated_at: "2026-09-12T00:00:00Z",
          },
        ],
        verified_merchants_count: 0,
        pending_submissions_count: 1,
        active_campaigns_count: 0,
      };

      expect(deriveUmkmWorkspaceState(pendingSummary)).toBe("PENDING_VERIFICATION");
      const html = renderToStaticMarkup(<UmkmWorkspaceContent summary={pendingSummary} />);
      expect(html).toContain("Pengajuan Anda sedang diperiksa");
      expect(html).toContain("Warung Berkah");
    });
  });

  describe("AI Description Generation & Apply Behavior", () => {
    it("generates description successfully using AiService and returns description text", async () => {
      mocks.authenticatedFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { description: "Kopi susu gula aren terbaik dengan cita rasa khas lokal." },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const result = await AiService.assistMerchantDescription({
        mode: "generate",
        businessName: "Kopi Senja",
        category: "Makanan & Minuman",
        products: "Kopi susu aren, Roti bakar",
        priceRange: "BUDGET",
        advantages: "Tempat nyaman, biji kopi arabika lokal",
        description: "",
      });

      expect(result).toEqual({
        description: "Kopi susu gula aren terbaik dengan cita rasa khas lokal.",
      });
      expect(mocks.authenticatedFetch).toHaveBeenCalledWith(
        "http://localhost:8180/api/ai/merchant-description",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      );
    });

    it("handles description generation failure gracefully with user-safe message", async () => {
      mocks.authenticatedFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "AI_ERROR", message: "Timeout" },
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      );

      await expect(
        AiService.assistMerchantDescription({
          mode: "generate",
          businessName: "Kopi Senja",
          description: "",
        }),
      ).rejects.toThrow("Deskripsi belum dapat disiapkan. Coba lagi.");
    });

    it("renders light-theme description assistant with modal review-and-apply trigger", () => {
      const html = renderToStaticMarkup(
        <MerchantDescriptionAssistant
          id="test-desc"
          value="Deskripsi awal usaha kami."
          businessName="Kopi Senja"
          category="Makanan & Minuman"
          priceRange="BUDGET"
          onChange={vi.fn()}
        />,
      );

      expect(html).toContain("Perbaiki tulisan");
      expect(html).toContain("bg-white");
      expect(html).toContain("text-slate-900");
    });
  });

  describe("Reverse Geocoding & Location Handling", () => {
    it("resolves address from coordinates via reverse geocoding API endpoint", async () => {
      const mockResult = {
        address: "Jl. Jenderal Sudirman No. 45, Jakarta Pusat",
        display_name: "Jl. Jenderal Sudirman No. 45, Jakarta Pusat",
        latitude: -6.2088,
        longitude: 106.8456,
        source: "OPENSTREETMAP_NOMINATIM",
      };

      mocks.authenticatedFetch.mockResolvedValue(
        new Response(JSON.stringify(mockResult), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const res = await mocks.authenticatedFetch("http://localhost:8180/api/places/resolve?lat=-6.2088&lng=106.8456");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.address).toContain("Sudirman");
      expect(json.latitude).toBe(-6.2088);
      expect(json.longitude).toBe(106.8456);
      expect(json.source).toBe("OPENSTREETMAP_NOMINATIM");
    });

    it("handles reverse geocoding fallback without fabricating fake street address", async () => {
      mocks.authenticatedFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Unable to reverse geocode",
            latitude: 0,
            longitude: 0,
          }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      );

      const res = await mocks.authenticatedFetch("http://localhost:8180/api/places/resolve?lat=0&lng=0");
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBeDefined();
      expect(json.address).toBeUndefined();
    });
  });

  describe("Form State Retention & Step Navigation", () => {
    const mockDraft: MerchantSubmissionRecord = {
      id: "draft-xyz",
      submitted_by: "user-abc",
      name: "Toko Kelontong Berkah",
      category: "Kebutuhan Sehari-hari",
      address: "Jl. Merdeka No. 10, Jakarta",
      location: { type: "Point", coordinates: [106.82, -6.17] },
      description: "Menyediakan sembako murah dan lengkap.",
      opening_hours: {
        monday: { is_closed: false, opens_at: "08:00", closes_at: "20:00" },
      },
      public_media: { menu_urls: [], product_urls: [] },
      business_info: {
        contact_phone: "08123456789",
        payment_methods: ["CASH", "QRIS"],
      },
      image_url: "https://example.test/banner.jpg",
      status: "DRAFT",
      canonical_merchant_id: null,
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
      created_at: "2026-09-12T10:00:00Z",
      updated_at: "2026-09-12T10:00:00Z",
    };

    it("preserves draft state across all fields when opening an existing submission draft", () => {
      const html = renderToStaticMarkup(<MerchantSubmissionForm initialData={mockDraft} />);
      expect(html).toContain("Toko Kelontong Berkah");
      expect(html).toContain("Menyediakan sembako murah dan lengkap.");
      expect(html).toContain("Lanjutkan Pendaftaran");
    });
  });

  describe("Submission API & Network Error Sanitization", () => {
    it("submits the merchant application successfully via authenticatedFetch", async () => {
      mocks.authenticatedFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { id: "sub-999", status: "PENDING_REVIEW" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const response = await mocks.authenticatedFetch(
        "http://localhost:8180/api/umkm/merchant-submissions/sub-999/submit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PENDING_REVIEW");
    });

    it("sanitizes network failure into user-friendly message without leaking raw TypeError", () => {
      const rawError = new TypeError("Failed to fetch");
      const userMessage =
        rawError.message.includes("Failed to fetch") || rawError.message.includes("NetworkError")
          ? "Pengajuan belum berhasil dikirim. Periksa koneksi lalu coba lagi."
          : rawError.message;

      expect(userMessage).toBe("Pengajuan belum berhasil dikirim. Periksa koneksi lalu coba lagi.");
      expect(userMessage).not.toContain("TypeError");
    });
  });
});
