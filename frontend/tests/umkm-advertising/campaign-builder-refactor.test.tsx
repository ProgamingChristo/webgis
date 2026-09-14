import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateManualCoordinates } from "@/src/features/umkm-advertising/ad-serving/utils/serving-location";
import { fromJakartaDatetimeLocal, toJakartaDatetimeLocal } from "@/src/features/umkm-advertising/lifecycle/components/campaign-schedule-editor";

const mocks = vi.hoisted(() => ({
  lifecycle: vi.fn(),
  servingPreview: vi.fn(),
}));

vi.mock("next/link", () => ({ default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/src/features/umkm-advertising/lifecycle", () => ({
  CampaignStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  CampaignLifecycleActions: () => <div>Tindakan lifecycle</div>,
  CampaignReadinessPanel: () => <div>Ringkasan kesiapan</div>,
  CampaignScheduleEditor: () => <div>Editor jadwal</div>,
  useCampaignLifecycle: mocks.lifecycle,
}));
vi.mock("@/src/features/umkm-advertising/creative/components/campaign-creative-manager", () => ({ CampaignCreativeManager: () => <div>Editor materi aktual</div> }));
vi.mock("@/src/features/umkm-advertising/targeting/components/campaign-targeting-manager", () => ({ CampaignTargetingManager: () => <div>Editor wilayah aktual</div> }));
vi.mock("@/src/features/umkm-advertising/ad-serving/hooks/use-serving-preview", () => ({ useServingPreview: mocks.servingPreview }));
vi.mock("@/src/features/umkm-advertising/ad-serving/components/sponsored-pin-preview-map", () => ({ SponsoredPinPreviewMap: ({ contextLocation }: any) => <div>Peta simulasi {contextLocation ? "bertitik" : "tanpa titik"}</div> }));
vi.mock("@/src/features/umkm-advertising/payment", () => ({
  CampaignPaymentPanel: () => <div>Panel pembayaran aktual</div>,
  CampaignPaymentStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import { CampaignCard } from "@/src/features/umkm-advertising/components/campaign/campaign-card";
import { ServingPreviewPanel } from "@/src/features/umkm-advertising/ad-serving/components/serving-preview-panel";

const campaign = {
  id: "campaign-1",
  merchantId: "merchant-1",
  createdBy: "owner-1",
  name: "Promo Sarapan",
  description: "Diskon menu pagi",
  status: "DRAFT" as const,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("campaign builder light workspace", () => {
  beforeEach(() => {
    mocks.lifecycle.mockReturnValue({
      lifecycle: {
        effectiveStatus: "DRAFT",
        startAt: null,
        endAt: null,
        readiness: { ready: false, blockers: ["TARGETING_NOT_CONFIGURED"], checks: { merchant: true, creative: true, targeting: false, schedule: false, payment: false } },
        allowedActions: { canEditSchedule: true, canPause: false, canResume: false, canCancel: true },
      },
      isUpdating: false,
      error: null,
      refetch: vi.fn(),
      updateSchedule: vi.fn(),
      pauseCampaign: vi.fn(),
      resumeCampaign: vi.fn(),
      cancelCampaign: vi.fn(),
    });
    mocks.servingPreview.mockReturnValue({ result: null, isLoading: false, error: null, evaluateServing: vi.fn(), resetResult: vi.fn() });
  });

  it("keeps a collapsed campaign compact with truthful readiness", () => {
    const html = renderToStaticMarkup(<CampaignCard campaign={campaign} merchantId="merchant-1" merchantName="Kedai Pagi" expanded={false} onToggle={vi.fn()} onUpdated={vi.fn()} />);
    expect(html).toContain("Promo Sarapan");
    expect(html).toContain("Kedai Pagi");
    expect(html).toContain("Kelola Promosi");
    expect(html).toContain("Belum lengkap");
    expect(html).not.toContain("Bagian promosi");
    expect(html).not.toContain("Editor materi aktual");
  });

  it("renders one coherent six-part workflow when expanded", () => {
    const html = renderToStaticMarkup(<CampaignCard campaign={campaign} merchantId="merchant-1" merchantName="Kedai Pagi" expanded onToggle={vi.fn()} onUpdated={vi.fn()} />);
    expect(html).toContain("Bagian promosi");
    expect(html).toContain("Wilayah Sasaran");
    expect(html).toContain("Jadwal &amp; Kesiapan");
    expect(html).toContain("Uji Penayangan");
    expect(html).toContain("Pembayaran");
    expect(html).toContain("Analitik");
    expect(html).toContain("Editor materi aktual");
    expect(html).not.toContain("bg-slate-900");
  });
});

describe("test-serving location UX", () => {
  it("does not invent a selected point when the business location is unavailable", () => {
    const html = renderToStaticMarkup(<ServingPreviewPanel merchantId="merchant-1" campaignId="campaign-1" merchantLocation={null} />);
    expect(html).toContain("Lokasi usaha belum tersedia");
    expect(html).toContain("Peta simulasi tanpa titik");
    expect(html).not.toContain("107.609");
    expect(html).not.toContain("-6.9175");
    expect(html).toContain("Tidak membuat tayangan, biaya, atau event iklan produksi.");
  });

  it("validates longitude and latitude independently without swapping them", () => {
    expect(validateManualCoordinates({ longitude: "181", latitude: "-6.2" }).errors.longitude).toContain("-180 dan 180");
    expect(validateManualCoordinates({ longitude: "107.6", latitude: "-91" }).errors.latitude).toContain("-90 dan 90");
    expect(validateManualCoordinates({ longitude: "107.609", latitude: "-6.9175" })).toEqual({
      context: { longitude: 107.609, latitude: -6.9175 },
      errors: {},
    });
  });
});

describe("campaign schedule timezone", () => {
  it("round-trips schedule fields using Asia/Jakarta instead of the browser timezone", () => {
    expect(toJakartaDatetimeLocal("2026-09-14T03:30:00.000Z")).toBe("2026-09-14T10:30");
    expect(fromJakartaDatetimeLocal("2026-09-14T10:30")).toBe("2026-09-14T03:30:00.000Z");
  });
});
