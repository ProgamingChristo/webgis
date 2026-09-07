import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), eligibility: vi.fn(), authorize: vi.fn() }));
vi.mock("@/src/lib/auth", () => ({ requireAuthenticatedUser: mocks.authorize }));
vi.mock("@/src/lib/supabase/server", () => ({ getRequestSupabaseClient: () => ({ from: mocks.from }) }));
vi.mock("@/src/lib/api-logger", () => ({ withApiLogger: (_req: unknown, _id: unknown, callback: () => unknown) => callback() }));
vi.mock("@/src/lib/api-security", () => ({ createOptionsHandler: () => vi.fn() }));
vi.mock("@/src/features/merchant-ownership", () => ({ MerchantOwnershipService: class {} }));
vi.mock("@/src/features/umkm-advertising", () => ({ AdvertisingEligibilityService: class { checkEligibility = mocks.eligibility; } }));

import { GET } from "@/app/api/umkm/advertising/my-merchants/route";

function request() {
  return new NextRequest("http://localhost/api/umkm/advertising/my-merchants", { headers: { Authorization: "Bearer test" } });
}

describe("Advertising owned merchant integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue("owner");
    mocks.eligibility.mockImplementation(async (_user: string, merchantId: string) => ({ eligible: true, merchantId }));
  });

  it("includes newly approved owned merchants beyond the former cap and preserves API reasons", async () => {
    const merchants = Array.from({ length: 101 }, (_, index) => ({ id: `merchant-${index}`, name: `Usaha ${index}`, owner_id: "owner", publish_status: "PUBLISHED", verification_status: "VERIFIED" }));
    const eq = vi.fn().mockReturnThis();
    const range = vi.fn(async (start: number, end: number) => ({ data: merchants.slice(start, end + 1), error: null }));
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq, order: vi.fn().mockReturnThis(), range });
    mocks.eligibility.mockImplementation(async (_user: string, merchantId: string) => merchantId === "merchant-100"
      ? { eligible: false, reason: "GEOMETRY_INVALID" }
      : { eligible: true, merchantId });

    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("owner_id", "owner");
    expect(range).toHaveBeenCalledWith(0, 99);
    expect(range).toHaveBeenCalledWith(100, 199);
    expect(body.data.ownedMerchants).toHaveLength(100);
    expect(body.data.ownedMerchants.some((merchant: { id: string }) => merchant.id === "merchant-99")).toBe(true);
    expect(body.data.ineligibleMerchants).toEqual([expect.objectContaining({ id: "merchant-100", reason: "GEOMETRY_INVALID" })]);
    expect(body.data.recommendedMerchants).toEqual([]);
    expect(mocks.eligibility).toHaveBeenCalledWith("owner", "merchant-100");
  });

  it("fails the request instead of returning an incomplete owner list when a page fails", async () => {
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: { message: "database unavailable" } }),
    });
    expect((await GET(request())).status).toBe(500);
    expect(mocks.eligibility).not.toHaveBeenCalled();
  });
});
