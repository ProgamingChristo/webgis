import { describe, expect, it } from "vitest";
import { AdvertisingEligibilityService } from "@/src/features/umkm-advertising/services/advertising-eligibility.service";

function query(result: unknown) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: result, error: null }),
    single: async () => ({ data: result, error: null }),
  };
  return builder;
}

function service(ownership: { isOwned: boolean; claimStatus: "PENDING" | "APPROVED" | "REJECTED" | null }) {
  const supabase: any = {
    from: (table: string) => table === "user_stakeholder_modes"
      ? query({ mode: "UMKM" })
      : query({ publish_status: "PUBLISHED", verification_status: "VERIFIED", location: { type: "Point" } }),
  };
  const ownershipService: any = {
    getOwnershipState: async () => ({ merchantId: "merchant-1", ownerId: ownership.isOwned ? "user-1" : null, ...ownership }),
  };
  return new AdvertisingEligibilityService(supabase, ownershipService);
}

describe("AdvertisingEligibilityService", () => {
  it("allows a verified active canonical owner", async () => {
    await expect(service({ isOwned: true, claimStatus: "APPROVED" }).checkEligibility("user-1", "merchant-1"))
      .resolves.toEqual({ eligible: true, merchantId: "merchant-1" });
  });

  it("does not treat a pending claim as advertising authority", async () => {
    await expect(service({ isOwned: false, claimStatus: "PENDING" }).checkEligibility("user-1", "merchant-1"))
      .resolves.toEqual({ eligible: false, reason: "OWNERSHIP_PENDING" });
  });
});
