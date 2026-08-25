import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildContributionPayload,
  CommunityContributionPage,
  serializeObservedAt,
  type CommunityContributionFormState,
} from "../src/features/community-contributions";
import {
  createCommunityContribution,
  getCommunityContributionHistory,
  searchContributionMerchants,
} from "../src/features/community-contributions/api/community-contributions.api";

vi.mock("@/src/lib/auth-client", () => ({
  authenticatedFetch: vi.fn(),
}));

const { authenticatedFetch } = await import("@/src/lib/auth-client");

const merchant = {
  id: "11111111-2222-4333-8444-555555555555",
  name: "Warung Akses",
  address: "Jl. Sudirman",
  priceLevel: "Rp15.000-Rp25.000",
  openingHours: { monday: "08:00-17:00" },
};

const baseState: CommunityContributionFormState = {
  reportType: "SIDEWALK_OBSTRUCTION",
  location: {
    longitude: 106.8272,
    latitude: -6.1754,
  },
  reportedNewLocation: null,
  observedAtLocal: "2026-08-24T09:30",
  details: "Motor parkir menutup trotoar",
  notes: "",
  facilityType: "RAMP",
  targetMerchant: null,
  reportedPriceLevel: "",
  reportedOpeningHours: {},
};

describe("Community Contribution Phase 2 UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
  });

  it("renders all six report choices and the explicit location controls", () => {
    const html = renderToStaticMarkup(
      createElement(CommunityContributionPage),
    );

    expect(html).toContain("Trotoar terhalang");
    expect(html).toContain("Ramp atau guiding block");
    expect(html).toContain("Penyeberangan");
    expect(html).toContain("Lokasi usaha berpindah");
    expect(html).toContain("Perubahan harga");
    expect(html).toContain("Perubahan jam buka");
    expect(html).toContain("Gunakan lokasi saya");
    expect(html).toContain("Pilih titik di peta");
    expect(html).toContain("Kirim laporan");
    expect(html).toContain("Riwayat");
    expect(html).not.toContain("+10");
    expect(html).not.toContain("trust +");
    expect(html).not.toContain("Anda mendapat poin");
  });

  it("serializes local observation time to an ISO timestamp", () => {
    const serialized = serializeObservedAt("2026-08-24T09:30");

    expect(serialized).toMatch(/^2026-08-24T/);
    expect(Number.isFinite(new Date(serialized).getTime())).toBe(true);
  });

  it.each([
    [
      "SIDEWALK_OBSTRUCTION",
      {
        report_type: "SIDEWALK_OBSTRUCTION",
        details: "Motor parkir menutup trotoar",
      },
    ],
    [
      "RAMP_OR_GUIDING_BLOCK",
      {
        report_type: "RAMP_OR_GUIDING_BLOCK",
        facility_type: "GUIDING_BLOCK",
        details: "Guiding block tertutup pot tanaman",
      },
    ],
    [
      "CROSSING",
      {
        report_type: "CROSSING",
        details: "Penyeberangan sulit terlihat",
      },
    ],
    [
      "MERCHANT_LOCATION_CHANGED",
      {
        report_type: "MERCHANT_LOCATION_CHANGED",
        target_merchant_id: merchant.id,
        reported_new_location: {
          longitude: 106.828,
          latitude: -6.176,
        },
        notes: "Pindah dua pintu",
      },
    ],
    [
      "MERCHANT_PRICE_CHANGED",
      {
        report_type: "MERCHANT_PRICE_CHANGED",
        target_merchant_id: merchant.id,
        reported_price_level: "Rp20.000-Rp30.000",
        notes: "Menu makan siang berubah",
      },
    ],
    [
      "MERCHANT_HOURS_CHANGED",
      {
        report_type: "MERCHANT_HOURS_CHANGED",
        target_merchant_id: merchant.id,
        reported_opening_hours: {
          monday: "08:00-17:00",
        },
        notes: "Tutup lebih cepat",
      },
    ],
  ] as const)("builds the Phase 1 payload for %s", (_name, expected) => {
    const state: CommunityContributionFormState = {
      ...baseState,
      reportType: expected.report_type,
      facilityType: "GUIDING_BLOCK",
      details:
        expected.report_type === "RAMP_OR_GUIDING_BLOCK"
          ? "Guiding block tertutup pot tanaman"
          : expected.report_type === "CROSSING"
            ? "Penyeberangan sulit terlihat"
            : baseState.details,
      targetMerchant:
        "target_merchant_id" in expected ? merchant : baseState.targetMerchant,
      reportedNewLocation:
        "reported_new_location" in expected
          ? expected.reported_new_location
          : null,
      reportedPriceLevel:
        "reported_price_level" in expected ? expected.reported_price_level : "",
      reportedOpeningHours:
        "reported_opening_hours" in expected
          ? expected.reported_opening_hours
          : {},
      notes: "notes" in expected ? expected.notes : "",
    };

    const payload = buildContributionPayload(state);

    expect(payload).toMatchObject(expected);
    expect(payload).toMatchObject({
      location: baseState.location,
    });
    expect(JSON.stringify(payload)).not.toContain("author_id");
    expect(JSON.stringify(payload)).not.toContain("status");
    expect(JSON.stringify(payload)).not.toContain("points");
    expect(JSON.stringify(payload)).not.toContain("trust_score");
    expect(JSON.stringify(payload)).not.toContain("moderator");
  });

  it("resets incompatible subtype state by building only the selected report payload", () => {
    const payload = buildContributionPayload({
      ...baseState,
      reportType: "SIDEWALK_OBSTRUCTION",
      targetMerchant: merchant,
      reportedNewLocation: {
        longitude: 106.828,
        latitude: -6.176,
      },
      reportedPriceLevel: "Rp99.000",
      notes: "should not leak",
    });

    expect(payload.report_type).toBe("SIDEWALK_OBSTRUCTION");
    expect(JSON.stringify(payload)).not.toContain(merchant.id);
    expect(JSON.stringify(payload)).not.toContain("reported_new_location");
    expect(JSON.stringify(payload)).not.toContain("Rp99.000");
  });

  it("prevents submit payloads from adding user-controlled system fields", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "contribution-1",
            reportType: "SIDEWALK_OBSTRUCTION",
            status: "PENDING",
          },
        }),
        { status: 201 },
      ),
    );

    await createCommunityContribution(buildContributionPayload(baseState));

    const [, init] = vi.mocked(authenticatedFetch).mock.calls[0]!;
    const body = JSON.parse(String(init?.body));

    expect(body.author_id).toBeUndefined();
    expect(body.status).toBeUndefined();
    expect(body.points).toBeUndefined();
    expect(body.trust_score).toBeUndefined();
    expect(init?.method).toBe("POST");
  });

  it("uses the canonical merchant lookup endpoint without demo data", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: [merchant],
        }),
        { status: 200 },
      ),
    );

    await expect(searchContributionMerchants("Warung")).resolves.toEqual([
      merchant,
    ]);

    const [url, init] = vi.mocked(authenticatedFetch).mock.calls[0]!;
    expect(String(url)).toContain("/api/community/contributions/merchants");
    expect(String(url)).toContain("query=Warung");
    expect(init?.method).toBe("GET");
  });

  it("loads contribution history from the authenticated backend endpoint", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: "history-1",
                reportType: "SIDEWALK_OBSTRUCTION",
                status: "PENDING",
                observedAt: "2026-08-24T09:30:00.000Z",
                submittedAt: "2026-08-24T09:35:00.000Z",
                createdAt: "2026-08-24T09:35:00.000Z",
                locationSummary: "Koordinat -6.1754, 106.8272",
                targetMerchantId: null,
                targetName: null,
                pointsAwarded: 0,
              },
            ],
            summary: {
              totalContributions: 1,
              pendingCount: 1,
              approvedCount: 0,
              rejectedCount: 0,
              contributionPoints: 0,
            },
            pagination: {
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
              hasMore: false,
            },
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      getCommunityContributionHistory(1, 10, {
        status: "PENDING",
        reportType: "SIDEWALK_OBSTRUCTION",
      }),
    ).resolves.toMatchObject({
      items: [
        {
          pointsAwarded: 0,
        },
      ],
      summary: {
        contributionPoints: 0,
      },
    });

    const [url, init] = vi.mocked(authenticatedFetch).mock.calls[0]!;
    expect(String(url)).toContain("/api/community/contributions?");
    expect(String(url)).toContain("page=1");
    expect(String(url)).toContain("limit=10");
    expect(String(url)).toContain("status=PENDING");
    expect(String(url)).toContain("report_type=SIDEWALK_OBSTRUCTION");
    expect(init?.method).toBe("GET");
  });

  it("maps backend validation errors to safe user-facing errors", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "SQL detail should not be shown",
          },
        }),
        { status: 400 },
      ),
    );

    await expect(
      createCommunityContribution(buildContributionPayload(baseState)),
    ).rejects.toThrow("Data laporan belum sesuai");
  });

  it.each([
    ["CONTRIBUTION_RATE_LIMITED", "Batas laporan sementara tercapai"],
    ["CONTRIBUTION_DUPLICATE", "Laporan serupa sudah Anda kirim"],
    ["INVALID_OBSERVATION_TIME", "Waktu pengamatan tidak valid"],
    ["INVALID_TARGET_LOCATION", "Lokasi baru terlalu dekat"],
  ] as const)(
    "maps Phase 3 backend error %s to Indonesian feedback",
    async (code, expectedMessage) => {
      vi.mocked(authenticatedFetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code,
              message: "internal detail should not drive the UI",
            },
          }),
          { status: code === "CONTRIBUTION_DUPLICATE" ? 409 : 400 },
        ),
      );

      await expect(
        createCommunityContribution(buildContributionPayload(baseState)),
      ).rejects.toThrow(expectedMessage);
    },
  );
});
