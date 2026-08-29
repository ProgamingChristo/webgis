import { describe, expect, it, vi } from "vitest";
import { UmkmIntelligenceService } from "@/src/features/umkm-intelligence";

describe("Phase 10 merchant-specific authorization", () => {
  it("denies a USER who neither owns nor has an approved claim", async () => {
    const repository = {
      getMerchant: vi.fn().mockResolvedValue({ id: "merchant", owner_id: "owner" }),
      getAccountRole: vi.fn().mockResolvedValue("USER"),
      hasApprovedClaim: vi.fn().mockResolvedValue(false),
    } as any;
    await expect(new UmkmIntelligenceService(repository).analyze("other-user", {
      merchant_id: "11111111-1111-4111-8111-111111111111",
      days: 30,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.hasApprovedClaim).toHaveBeenCalledWith("other-user", "11111111-1111-4111-8111-111111111111");
  });

  it("does not consult claims for the canonical owner", async () => {
    const repository = {
      getMerchant: vi.fn().mockResolvedValue({ id: "merchant", owner_id: "owner", location: null, metadata: {}, name: "Unknown", description: null, address: null, opening_hours: null, price_level: null, is_mobile: false, publish_status: "DRAFT", verification_status: "UNVERIFIED", updated_at: "2026-08-28T00:00:00Z" }),
      getAccountRole: vi.fn().mockResolvedValue("USER"),
      hasApprovedClaim: vi.fn(),
    } as any;
    const response = await new UmkmIntelligenceService(repository).analyze("owner", {
      merchant_id: "11111111-1111-4111-8111-111111111111",
      days: 30,
    });
    expect(response.market_context.status).toBe("UNAVAILABLE");
    expect(repository.hasApprovedClaim).not.toHaveBeenCalled();
  });
});
