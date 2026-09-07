import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvertisingEligibilityResult } from "@/src/features/umkm-advertising/types/advertising-eligibility.types";

const mocks = vi.hoisted(() => ({ eligibility: vi.fn() }));
vi.mock("@/src/features/umkm-advertising/hooks/use-advertising-eligibility", () => ({ useAdvertisingEligibility: mocks.eligibility }));

import { PromotionReadinessCard } from "@/src/features/umkm-workspace/components/promotion-readiness-card";
import { AdvertisingEligibilityGate } from "@/src/features/umkm-advertising/components/advertising-eligibility-gate";

function setEligibility(eligibility: AdvertisingEligibilityResult | null, loading = false, error: string | null = null) {
  mocks.eligibility.mockReturnValue({ eligibility, loading, error, refetch: vi.fn() });
}

describe("Promotion readiness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only offers creation for the merchant accepted by the eligibility API", () => {
    setEligibility({ eligible: true, merchantId: "usaha-b" });
    const html = renderToStaticMarkup(<PromotionReadinessCard merchantId="usaha-b" merchantName="Warung B" />);
    expect(mocks.eligibility).toHaveBeenCalledWith("usaha-b", undefined);
    expect(html).toContain("Siap Dipromosikan");
    expect(html).toContain("Warung B");
    expect(html).toContain("/umkm/advertising?merchantId=usaha-b#buat-promosi");
    expect(html).toContain("Buat Promosi");
  });

  it.each([
    ["MERCHANT_INACTIVE", "belum aktif atau belum dipublikasikan"],
    ["MERCHANT_UNVERIFIED", "belum terverifikasi"],
    ["GEOMETRY_INVALID", "Koordinat usaha belum valid"],
    ["PROFILE_INCOMPLETE", "belum memenuhi persyaratan"],
    ["OWNERSHIP_PENDING", "Klaim kepemilikan sedang diperiksa"],
  ] as const)("shows the real %s reason and blocks campaign creation", (reason, message) => {
    setEligibility({ eligible: false, reason });
    const html = renderToStaticMarkup(<PromotionReadinessCard merchantId="usaha-b" />);
    expect(html).toContain("Belum Siap Dipromosikan");
    expect(html).toContain(message);
    expect(html).toContain("Lihat yang perlu dilengkapi");
    expect(html).not.toContain("Buat Promosi");
    const gate = renderToStaticMarkup(<AdvertisingEligibilityGate merchantId="usaha-b"><div>CAMPAIGN_CREATION</div></AdvertisingEligibilityGate>);
    expect(gate).not.toContain("CAMPAIGN_CREATION");
    expect(gate).toContain(message);
  });

  it("keeps the selected merchant when linking to required location corrections", () => {
    setEligibility({ eligible: false, reason: "GEOMETRY_INVALID" });
    const html = renderToStaticMarkup(<PromotionReadinessCard merchantId="usaha-b" />);
    expect(html).toContain("/umkm?merchantId=usaha-b#visibilitas");
  });

  it("does not expose a creation CTA while checking or after a failed check", () => {
    setEligibility(null, true);
    const loading = renderToStaticMarkup(<PromotionReadinessCard merchantId="usaha-b" />);
    expect(loading).toContain("Memeriksa kesiapan");
    expect(loading).not.toContain("Buat Promosi");
    setEligibility(null, false, "Kesiapan promosi belum dapat diperiksa.");
    const failed = renderToStaticMarkup(<PromotionReadinessCard merchantId="usaha-b" />);
    expect(failed).toContain("Coba lagi");
    expect(failed).not.toContain("Buat Promosi");
  });
});
