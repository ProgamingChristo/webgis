import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiDelete } = vi.hoisted(() => ({ apiDelete: vi.fn() }));

vi.mock("@/src/lib/api-client", () => ({
  apiClient: { delete: apiDelete },
}));

import { UmkmWorkspaceService } from "@/src/features/umkm-workspace/services/umkm-workspace.service";

describe("UmkmWorkspaceService archive", () => {
  beforeEach(() => apiDelete.mockReset());

  it("calls the authenticated owner-only archive endpoint", async () => {
    apiDelete.mockResolvedValue({
      merchant_id: "merchant-owned",
      status: "ARCHIVED",
      blocking_campaigns_count: 0,
    });

    await UmkmWorkspaceService.archiveOwnedMerchant("merchant-owned");

    expect(apiDelete).toHaveBeenCalledWith("/api/umkm/merchants/merchant-owned");
  });
});
