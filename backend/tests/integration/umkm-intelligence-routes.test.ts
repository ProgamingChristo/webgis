import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { createUmkmIntelligenceHandler } from "@/app/api/umkm/intelligence/route";
import { createUmkmCopilotHandler } from "@/app/api/umkm/intelligence/copilot/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const merchantId = "11111111-1111-4111-8111-111111111111";
const result = {
  merchant: {
    id: merchantId, name: "Merchant Uji", category: "Bakso", category_slug: "bakso",
    address: "Jakarta", longitude: 106.8, latitude: -6.2, is_mobile: false,
    publish_status: "PUBLISHED", verification_status: "VERIFIED", source_evidence: ["PREMIUM"],
    source_freshness: "FRESH", updated_at: "2026-08-28T00:00:00.000Z",
  },
  data_readiness: { score: 80, status: "READY", model_version: "GETRA_DATA_READINESS_V1", components: [] },
  visibility: { score: 70, status: "DEVELOPING", model_version: "GETRA_VISIBILITY_READINESS_V1", components: [] },
  location_readiness: { score: 75, status: "DEVELOPING", model_version: "GETRA_LOCATION_READINESS_V1", components: [] },
  market_context: {
    status: "AVAILABLE", area: null, category_slug: "bakso",
    window: { start_at: "2026-07-29T00:00:00.000Z", end_at: "2026-08-28T00:00:00.000Z" },
    demand_score: 72, supply_score: 38, retail_gap: 34, raw_counts: null,
    confidence: "MODERATE_EVIDENCE", demand_model_version: "GETRA_DEMAND_V1",
    retail_gap_model_version: "GETRA_RETAIL_GAP_V1", claim_scope: "GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL",
  },
  location_context: { network_status: "ROUTABLE", nearest_transit: null, analysis_method: "PGROUTING_NETWORK" },
  nearby_similar_merchants: [], recommendations: [],
  model_versions: {
    data_readiness: "GETRA_DATA_READINESS_V1", visibility: "GETRA_VISIBILITY_READINESS_V1",
    location_readiness: "GETRA_LOCATION_READINESS_V1", demand: "GETRA_DEMAND_V1",
    retail_gap: "GETRA_RETAIL_GAP_V1", recommendations: "GETRA_UMKM_RECOMMENDATIONS_V1",
  },
  limitations: ["Observed signals are not financial forecasts."],
} as any;

function get(query = `merchant_id=${merchantId}&days=30`) {
  return new NextRequest(`http://localhost/api/umkm/intelligence?${query}`);
}

describe("Phase 10 UMKM intelligence routes", () => {
  it("denies anonymous requests before analysis", async () => {
    const analyze = vi.fn();
    const response = await createUmkmIntelligenceHandler({
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      analyze,
    })(get());
    expect(response.status).toBe(401);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("returns only owner-authorized, frontend-safe evidence", async () => {
    const analyze = vi.fn().mockResolvedValue(result);
    const response = await createUmkmIntelligenceHandler({
      authorize: vi.fn().mockResolvedValue("owner-id"),
      analyze,
    })(get());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(analyze).toHaveBeenCalledWith("owner-id", { merchant_id: merchantId, days: 30 });
    expect(body.data.model_versions.demand).toBe("GETRA_DEMAND_V1");
    expect(JSON.stringify(body)).not.toMatch(/service.role|x-api-key|authorization|raw_payload|auth_token/i);
  });

  it("preserves non-owner denial from the service boundary", async () => {
    const response = await createUmkmIntelligenceHandler({
      authorize: vi.fn().mockResolvedValue("non-owner"),
      analyze: vi.fn().mockRejectedValue(new ApplicationError("FORBIDDEN", "Merchant ownership is required.")),
    })(get());
    expect(response.status).toBe(403);
  });

  it("strictly rejects invalid merchant IDs and time windows", async () => {
    const analyze = vi.fn();
    const dependencies = { authorize: vi.fn().mockResolvedValue("owner"), analyze };
    expect((await createUmkmIntelligenceHandler(dependencies)(get("merchant_id=../../secret&days=30"))).status).toBe(400);
    expect((await createUmkmIntelligenceHandler(dependencies)(get(`merchant_id=${merchantId}&days=365`))).status).toBe(400);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("recomputes Copilot facts server-side and returns grounded evidence", async () => {
    const explain = vi.fn().mockResolvedValue({
      status: "DETERMINISTIC_FALLBACK",
      answer: "Demand Score 72 dan Retail Gap 34 berasal dari sinyal GETRA.",
      evidence: { merchant_id: merchantId, demand_score: 72, retail_gap: 34 },
      limitations: result.limitations,
    });
    const response = await createUmkmCopilotHandler({
      authorize: vi.fn().mockResolvedValue("owner"),
      analyze: vi.fn().mockResolvedValue(result),
      explain,
    })(new NextRequest("http://localhost/api/umkm/intelligence/copilot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, days: 30, question: "Bagaimana demand saya?" }),
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(explain).toHaveBeenCalledWith(result, "Bagaimana demand saya?");
    expect(JSON.stringify(body)).not.toMatch(/service.role|x-api-key|authorization|raw_payload/i);
  });

  it("rejects arbitrary properties in the Copilot body", async () => {
    const explain = vi.fn();
    const response = await createUmkmCopilotHandler({
      authorize: vi.fn().mockResolvedValue("owner"), analyze: vi.fn(), explain,
    })(new NextRequest("http://localhost/api/umkm/intelligence/copilot", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, days: 30, question: "Halo", provider_path: "/secret" }),
    }));
    expect(response.status).toBe(400);
    expect(explain).not.toHaveBeenCalled();
  });
});
