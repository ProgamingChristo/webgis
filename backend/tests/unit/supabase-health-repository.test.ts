import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  SupabaseHealthRepository,
  type StorageHealthClient,
} from "@/src/repositories/supabase-health.repository";

describe("SupabaseHealthRepository", () => {
  it("reports connected only after a successful Storage metadata request", async () => {
    const listBuckets = vi.fn().mockResolvedValue({ data: [], error: null });
    const client: StorageHealthClient = { storage: { listBuckets } };
    const repository = new SupabaseHealthRepository(() => client);

    await expect(repository.checkConnection()).resolves.toEqual({
      status: "connected",
    });
    expect(listBuckets).toHaveBeenCalledOnce();
    expect(listBuckets).toHaveBeenCalledWith({ limit: 1, offset: 0 });
  });

  it("maps SDK errors and network failures to an unavailable state", async () => {
    const apiErrorClient: StorageHealthClient = {
      storage: {
        listBuckets: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "sb_publishable_fake SQL detail" },
        }),
      },
    };
    const networkErrorClient: StorageHealthClient = {
      storage: {
        listBuckets: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
      },
    };

    await expect(
      new SupabaseHealthRepository(() => apiErrorClient).checkConnection(),
    ).resolves.toEqual({ reason: "storage_api_error", status: "unavailable" });
    await expect(
      new SupabaseHealthRepository(() => networkErrorClient).checkConnection(),
    ).resolves.toEqual({ reason: "network_error", status: "unavailable" });
  });
});
