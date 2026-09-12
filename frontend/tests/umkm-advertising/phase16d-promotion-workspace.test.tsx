import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/umkm/advertising",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

// Mock hooks
const mocks = vi.hoisted(() => ({
  userMerchants: vi.fn(),
  advertisingEligibility: vi.fn(),
  campaigns: vi.fn(),
  createCampaign: vi.fn(),
}));

vi.mock("@/src/features/umkm-advertising/hooks/use-user-merchants", () => ({
  useUserMerchants: mocks.userMerchants,
}));

vi.mock("@/src/features/umkm-advertising/hooks/use-advertising-eligibility", () => ({
  useAdvertisingEligibility: mocks.advertisingEligibility,
}));

vi.mock("@/src/features/umkm-advertising/hooks/use-campaigns", () => ({
  useCampaigns: mocks.campaigns,
}));

vi.mock("@/src/features/umkm-advertising/hooks/use-create-campaign", () => ({
  useCreateCampaign: mocks.createCampaign,
}));

import AdvertisingPage from "@/app/umkm/advertising/page";

describe("PHASE 16D — Frontend Promotion Workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.campaigns.mockReturnValue({ campaigns: [], loading: false, error: null, refetch: vi.fn() });
    mocks.createCampaign.mockReturnValue({ create: vi.fn(), loading: false, error: null });
  });

  it("Test A: displays Menunggu verifikasi card for pending submission with campaign creation disabled", () => {
    mocks.userMerchants.mockReturnValue({
      ownedMerchants: [],
      ineligibleMerchants: [
        {
          id: "sub-1",
          name: "Kopi Bundaran",
          address: "Jl. Bundaran No. 1",
          publish_status: "PENDING_REVIEW",
          verification_status: "PENDING",
          relationshipState: "SUBMISSION_PENDING",
          statusLabel: "Menunggu verifikasi",
          canCreateCampaign: false,
          reason: "SUBMISSION_PENDING",
          detailMessage: "Verifikasi diperlukan sebelum promosi dapat dibuat.",
          actionLabel: "Lihat Status",
          actionHref: "/umkm#pengajuan",
        },
      ],
      allBusinesses: [
        {
          id: "sub-1",
          name: "Kopi Bundaran",
          address: "Jl. Bundaran No. 1",
          publish_status: "PENDING_REVIEW",
          verification_status: "PENDING",
          relationshipState: "SUBMISSION_PENDING",
          statusLabel: "Menunggu verifikasi",
          canCreateCampaign: false,
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<AdvertisingPage />);

    expect(html).toContain("Kopi Bundaran");
    expect(html).toContain("Menunggu verifikasi");
    expect(html).toContain("Verifikasi diperlukan sebelum promosi dapat dibuat.");
    expect(html).toContain("/umkm#pengajuan");
    expect(html).toContain("Lihat Status");
    // Campaign creation form must NOT be rendered
    expect(html).not.toContain("Buat Draf Promosi");
  });

  it("Test B: displays Claim sedang diperiksa card for pending claim with campaign creation disabled", () => {
    mocks.userMerchants.mockReturnValue({
      ownedMerchants: [],
      ineligibleMerchants: [
        {
          id: "claim-merchant-1",
          name: "Bakso Pak Jaya",
          address: "Jl. Braga No. 10",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          relationshipState: "CLAIM_PENDING",
          statusLabel: "Claim sedang diperiksa",
          canCreateCampaign: false,
          reason: "CLAIM_PENDING",
          detailMessage: "Setelah kepemilikan disetujui, usaha dapat dipromosikan.",
          actionLabel: "Lihat Status",
          actionHref: "/umkm#klaim",
        },
      ],
      allBusinesses: [
        {
          id: "claim-merchant-1",
          name: "Bakso Pak Jaya",
          address: "Jl. Braga No. 10",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          relationshipState: "CLAIM_PENDING",
          statusLabel: "Claim sedang diperiksa",
          canCreateCampaign: false,
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<AdvertisingPage />);

    expect(html).toContain("Bakso Pak Jaya");
    expect(html).toContain("Claim sedang diperiksa");
    expect(html).toContain("Setelah kepemilikan disetujui, usaha dapat dipromosikan.");
    expect(html).toContain("/umkm#klaim");
    expect(html).toContain("Lihat Status");
    // Campaign creation form must NOT be rendered
    expect(html).not.toContain("Buat Draf Promosi");
  });

  it("Test C & D: displays Siap dipromosikan and campaign create form for verified eligible owner", () => {
    mocks.userMerchants.mockReturnValue({
      ownedMerchants: [
        {
          id: "merchant-1",
          name: "Warung ABC",
          address: "Jl. Riau No. 5",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          relationshipState: "VERIFIED_OWNER",
          statusLabel: "Siap dipromosikan",
          canCreateCampaign: true,
        },
      ],
      ineligibleMerchants: [],
      allBusinesses: [
        {
          id: "merchant-1",
          name: "Warung ABC",
          address: "Jl. Riau No. 5",
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          relationshipState: "VERIFIED_OWNER",
          statusLabel: "Siap dipromosikan",
          canCreateCampaign: true,
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mocks.advertisingEligibility.mockReturnValue({
      eligibility: { eligible: true, merchantId: "merchant-1" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<AdvertisingPage />);

    expect(html).toContain("Warung ABC");
    expect(html).toContain("Siap dipromosikan");
    expect(html).toContain("Buat Draf Promosi");
  });

  it("Test K: displays Profil perlu dilengkapi when verified owner profile is incomplete", () => {
    mocks.userMerchants.mockReturnValue({
      ownedMerchants: [],
      ineligibleMerchants: [
        {
          id: "merchant-incomplete",
          name: "Toko Belum Lengkap",
          address: null,
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          relationshipState: "VERIFIED_OWNER",
          statusLabel: "Profil perlu dilengkapi",
          canCreateCampaign: false,
          reason: "PROFILE_INCOMPLETE",
        },
      ],
      allBusinesses: [
        {
          id: "merchant-incomplete",
          name: "Toko Belum Lengkap",
          address: null,
          publish_status: "PUBLISHED",
          verification_status: "VERIFIED",
          relationshipState: "VERIFIED_OWNER",
          statusLabel: "Profil perlu dilengkapi",
          canCreateCampaign: false,
          reason: "PROFILE_INCOMPLETE",
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mocks.advertisingEligibility.mockReturnValue({
      eligibility: { eligible: false, reason: "PROFILE_INCOMPLETE" },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const html = renderToStaticMarkup(<AdvertisingPage />);

    expect(html).toContain("Toko Belum Lengkap");
    expect(html).toContain("Profil perlu dilengkapi");
    expect(html).toContain("Data profil usaha belum memenuhi persyaratan promosi.");
    expect(html).not.toContain("Buat Draf Promosi");
  });
});
