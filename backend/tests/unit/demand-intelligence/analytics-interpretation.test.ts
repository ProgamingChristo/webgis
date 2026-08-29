import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStructured } from "@/lib/ai/provider";
import { AnalyticsInterpretationService } from "@/src/features/demand-intelligence";

vi.mock("@/lib/ai/provider", () => ({ generateStructured: vi.fn() }));

const result = {
  category: { slug: "bakso", name: "Bakso" },
  window: { start_at: "2026-07-29T00:00:00Z", end_at: "2026-08-28T00:00:00Z" },
  claim_scope: "GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL",
  rows: [{
    spatial_unit: { id: "jakarta-selatan", name: "Jakarta Selatan" },
    demand_score: 72,
    supply_score: 38,
    retail_gap: 34,
    raw_counts: { search_events: 2, route_requests: 1, commuter_requests: 0, transaction_observations: 1, campaign_interactions: 0, canonical_merchants: 3 },
    evidence: { sample_size: 4, confidence: "LIMITED_EVIDENCE" },
  }],
  limitations: ["Observed only"],
} as any;

describe("Phase 09 grounded analytics interpretation", () => {
  beforeEach(() => vi.mocked(generateStructured).mockReset());

  it("accepts an explanation only when its numbers and claims are grounded", async () => {
    vi.mocked(generateStructured).mockResolvedValue({ data: { answer: "Pada data GETRA, Demand Score 72, Supply Score 38, dan Retail Gap 34." }, source: "openai" });
    const response = await new AnalyticsInterpretationService().explain(result, "jakarta-selatan");
    expect(response.status).toBe("AI");
    expect(response.evidence.retail_gap).toBe(34);
  });

  it("rejects invented numbers and unsafe opportunity claims", async () => {
    vi.mocked(generateStructured).mockResolvedValue({ data: { answer: "Demand Score 80 dan pasti untung besar dengan ROI tinggi." }, source: "openai" });
    const response = await new AnalyticsInterpretationService().explain(result, "jakarta-selatan");
    expect(response.status).toBe("DETERMINISTIC_FALLBACK");
    expect(response.answer).toContain("Demand Score 72");
    expect(response.answer).not.toContain("80");
  });

  it("keeps analytics usable when AI is unavailable", async () => {
    vi.mocked(generateStructured).mockResolvedValue(null);
    const response = await new AnalyticsInterpretationService().explain(result, "jakarta-selatan");
    expect(response.status).toBe("DETERMINISTIC_FALLBACK");
    expect(response.answer).toContain("Retail Gap 34");
  });
});
