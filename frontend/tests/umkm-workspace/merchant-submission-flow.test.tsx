import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission/types/merchant-submission.types";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/src/features/merchant-submission/components/merchant-submission-map-picker", () => ({
  MerchantMapPicker: () => <div>Map picker</div>,
}));
vi.mock("@/src/features/merchant-submission/components/merchant-description-assistant", () => ({
  MerchantDescriptionAssistant: ({ value, id }: { value: string; id: string }) => <textarea id={id} defaultValue={value} />,
}));

import { MerchantSubmissionForm } from "@/src/features/merchant-submission/components/merchant-submission-form";
import { getRegistrationValidationIssue, OPERATING_DAYS } from "@/src/features/merchant-submission/services/merchant-registration-validation";
import { MerchantRegistrationPreview, MerchantRegistrationSteps } from "@/src/features/merchant-submission/components/merchant-registration-steps";

const openingHours = Object.fromEntries(OPERATING_DAYS.map(([key]) => [key, { is_closed: false, opens_at: "08:00", closes_at: "21:00" }]));
const registration = {
  name: "Warung Nusantara",
  category: "Makanan & Minuman",
  address: "Jalan Nusantara 10",
  coordinates: [106.8, -6.2] as [number, number],
  openingHours,
  hasPhoto: true,
  contactPhone: "081234567890",
};

describe("merchant search-first registration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts with merchant search and offers no registration bypass before a search", () => {
    const html = renderToStaticMarkup(<MerchantSubmissionForm />);
    expect(html).toContain("Daftarkan / Klaim Usaha");
    expect(html).toContain('id="claim-merchant-search"');
    expect(html).toContain("Cari Usaha");
    expect(html).not.toContain("Daftarkan Usaha Baru</button>");
    expect(html).not.toContain("Nama Usaha / Toko");
    expect(html).not.toContain("Klaim Usaha yang Sudah Ada");
  });

  it("opens an existing draft on its identity step with values intact and no search prerequisite", () => {
    const draft: MerchantSubmissionRecord = {
      id: "draft-1", submitted_by: "user-1", ...registration,
      description: "Kopi dan makanan rumahan", location: { type: "Point", coordinates: registration.coordinates },
      opening_hours: openingHours, public_media: { menu_urls: [], product_urls: [] },
      business_info: { contact_phone: registration.contactPhone, payment_methods: ["CASH"] },
      image_url: "https://example.test/store.jpg", status: "DRAFT", canonical_merchant_id: null,
      reviewed_by: null, reviewed_at: null, review_note: null,
      created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z",
    };
    const html = renderToStaticMarkup(<MerchantSubmissionForm initialData={draft} />);
    expect(html).toContain("Lanjutkan Pendaftaran");
    expect(html).toContain('value="Warung Nusantara"');
    expect(html).toContain("Kopi dan makanan rumahan");
    expect(html).toContain("Simpan Draft");
    expect(html).toContain('aria-current="step"');
    expect(html).not.toContain('id="claim-merchant-search"');
    expect(html).not.toContain("Map picker");
    expect(html).not.toContain("Ajukan Verifikasi");
  });

  it("announces the current step and disables navigation while saving", () => {
    const html = renderToStaticMarkup(<MerchantRegistrationSteps currentStep={3} disabled onStepChange={vi.fn()} />);
    expect(html).toContain("Langkah 4 dari 6");
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html.match(/disabled=""/g)).toHaveLength(6);
  });

  it("previews only entered information and explicitly identifies missing fields", () => {
    const html = renderToStaticMarkup(<MerchantRegistrationPreview
      name="Warung A" category="Kuliner" description="" address=""
      coordinates={[106.8, -6.2]} contactPhone="" paymentMethods={[]} hasPhoto={false} hasMenu={false}
      operatingHours={<span>Senin: Tutup</span>}
    />);
    expect(html).toContain("Warung A");
    expect(html).toContain("Belum diisi");
    expect(html).toContain("Foto utama: belum ada");
    expect(html).toContain("Senin: Tutup");
    expect(html).not.toContain("Terverifikasi");
  });
});

describe("registration step and draft validation", () => {
  it("validates only the current step on next, so later fields do not block identity entry", () => {
    expect(getRegistrationValidationIssue({ ...registration, address: "", hasPhoto: false }, false, 0)).toBeNull();
    expect(getRegistrationValidationIssue({ ...registration, address: "" }, false, 1)).toMatchObject({ step: 1 });
  });

  it.each([
    [{ name: "x" }, 0],
    [{ category: "" }, 0],
    [{ address: "" }, 1],
    [{ coordinates: [Number.NaN, -6.2] as [number, number] }, 1],
    [{ contactPhone: "12" }, 2],
    [{ openingHours: { ...openingHours, monday: { is_closed: false, opens_at: "21:00", closes_at: "08:00" } } }, 2],
    [{ hasPhoto: false }, 4],
  ])("routes invalid review input %j to the section that can fix it", (override, step) => {
    expect(getRegistrationValidationIssue({ ...registration, ...override }, true)).toMatchObject({ step });
  });

  it("keeps existing drafts valid without a photo but requires it for review", () => {
    const values = { ...registration, hasPhoto: false };
    expect(getRegistrationValidationIssue(values, false)).toBeNull();
    expect(getRegistrationValidationIssue(values, true)).toMatchObject({ step: 4 });
    expect(getRegistrationValidationIssue(registration, true)).toBeNull();
  });

  it("allows closed days without times while preserving validation of open days", () => {
    expect(getRegistrationValidationIssue({ ...registration, openingHours: {
      ...openingHours, monday: { is_closed: true, opens_at: null, closes_at: null },
    } }, true)).toBeNull();
  });
});
