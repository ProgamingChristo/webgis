import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { createDemandAnalyticsHandler } from "@/app/api/analytics/demand/route";
import { createRetailGapHandler } from "@/app/api/analytics/retail-gap/route";
import { createAnalyticsInterpretationHandler } from "@/app/api/analytics/interpretation/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const result = {
  demand_model_version: "GETRA_DEMAND_V1",
  retail_gap_model_version: "GETRA_RETAIL_GAP_V1",
  spatial_unit_type: "ADMINISTRATIVE_CITY",
  category: { id: "category-id", slug: "bakso", name: "Bakso" },
  window: { start_at: "2026-07-29T12:00:00.000Z", end_at: "2026-08-28T12:00:00.000Z" },
  weights: { SEARCH: 1, ROUTE_REQUEST: 2 },
  normalization: "LOG_RELATIVE_TO_ALL_SUPPORTED_REGIONS_SAME_CATEGORY_WINDOW",
  claim_scope: "GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL",
  rows: [{
    spatial_unit: { id: "jakarta-selatan", name: "Jakarta Selatan", type: "ADMINISTRATIVE_CITY", geometry: { type: "MultiPolygon", coordinates: [] } },
    category: { slug: "bakso" },
    raw_counts: { search_events: 2, route_requests: 1, commuter_requests: 0, transaction_observations: 1, campaign_interactions: 1, canonical_merchants: 3 },
    weighted_demand: 6,
    demand_score: 72,
    supply_score: 38,
    retail_gap: 34,
    evidence: { sample_size: 4, source_diversity: 3, source_types: ["SEARCH", "ROUTE_REQUEST", "TRANSACTION_OBSERVATION"], latest_signal_at: "2026-08-28T10:00:00Z", coverage_status: "PILOT_OBSERVED_DATA", confidence: "LIMITED_EVIDENCE" },
  }],
  limitations: ["Observed signals are not total population demand."],
} as any;

function get(path: string) { return new NextRequest(`http://localhost${path}`); }

describe("Phase 09 aggregate analytics routes", () => {
  it("requires authentication before analytics execution", async () => {
    const analyze = vi.fn();
    const response = await createDemandAnalyticsHandler({
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      analyze,
    })(get("/api/analytics/demand?category=bakso&days=30&region_ids=jakarta-selatan"));
    expect(response.status).toBe(401);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("returns demand and Retail Gap from the same server model", async () => {
    const dependencies = { authorize: vi.fn().mockResolvedValue("user"), analyze: vi.fn().mockResolvedValue(result) };
    const demand = await createDemandAnalyticsHandler(dependencies)(get("/api/analytics/demand?category=bakso&days=30&region_ids=jakarta-selatan"));
    const gap = await createRetailGapHandler(dependencies)(get("/api/analytics/retail-gap?category=bakso&days=30&region_ids=jakarta-selatan"));
    expect((await demand.json()).data).toMatchObject({ mode: "DEMAND", demand_model_version: "GETRA_DEMAND_V1" });
    expect((await gap.json()).data).toMatchObject({ mode: "RETAIL_GAP", retail_gap_model_version: "GETRA_RETAIL_GAP_V1" });
  });

  it("rejects invalid categories and oversized date windows", async () => {
    const dependencies = { authorize: vi.fn().mockResolvedValue("user"), analyze: vi.fn() };
    const invalid = await createDemandAnalyticsHandler(dependencies)(get("/api/analytics/demand?category=../../secret&days=30&region_ids=jakarta-selatan"));
    expect(invalid.status).toBe(400);
    expect(dependencies.analyze).not.toHaveBeenCalled();
  });

  it("returns only a safe, backend-grounded interpretation", async () => {
    const explanation = {
      status: "DETERMINISTIC_FALLBACK",
      answer: "Demand Score 72, Supply Score 38, Retail Gap 34.",
      evidence: { region_id: "jakarta-selatan", category: "bakso", demand_score: 72, supply_score: 38, retail_gap: 34, sample_size: 4, confidence: "LIMITED_EVIDENCE", window: result.window },
      limitations: result.limitations,
    } as any;
    const response = await createAnalyticsInterpretationHandler({
      authorize: vi.fn().mockResolvedValue("user"),
      analyze: vi.fn().mockResolvedValue(result),
      explain: vi.fn().mockResolvedValue(explanation),
    })(new NextRequest("http://localhost/api/analytics/interpretation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "category=bakso&days=30&region_ids=jakarta-selatan", region_id: "jakarta-selatan" }),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.evidence.retail_gap).toBe(34);
    expect(JSON.stringify(body)).not.toMatch(/service_role|authorization|user-id|x-api-key/i);
  });
});
