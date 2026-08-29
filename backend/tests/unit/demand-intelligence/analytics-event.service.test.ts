import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsEventService } from "@/src/features/demand-intelligence";

describe("Phase 09 aggregate-safe event instrumentation", () => {
  beforeEach(() => vi.spyOn(Date, "now").mockReturnValue(1_777_000_000_000));

  it("deduplicates a burst without persisting actor identity or raw query", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ upsert }) } as any;
    const service = new AnalyticsEventService(supabase);
    const result = {
      intent: {
        category: null,
        keyword: "bakso",
        original_query: "bakso Jakarta Selatan",
        scope: { type: "REGION", region_ids: ["jakarta-selatan"] },
      },
      merchants: [],
      total: 4,
    } as any;
    await service.recordSearch("private-user-id", result);
    await service.recordSearch("private-user-id", result);
    const first = upsert.mock.calls[0][0];
    const second = upsert.mock.calls[1][0];
    expect(first.dedup_key).toBe(second.dedup_key);
    expect(first).not.toHaveProperty("actor_id");
    expect(first.metadata).not.toHaveProperty("query");
    expect(first).toMatchObject({ category_slug: "bakso", region_ids: ["jakarta-selatan"] });
  });
});
