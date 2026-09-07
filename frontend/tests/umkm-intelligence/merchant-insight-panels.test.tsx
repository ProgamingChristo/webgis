import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReadinessComponent, UmkmIntelligenceResult } from "@/src/features/umkm-intelligence/types/umkm-intelligence.types";
import { getReadinessPresentation } from "@/src/features/umkm-intelligence/utils/readiness-presentation";

vi.mock("@/src/features/umkm-intelligence/components/umkm-intelligence-map", () => ({
  UmkmIntelligenceMap: () => <div data-testid="merchant-map" />,
}));
vi.mock("@/src/features/umkm-intelligence/hooks/use-umkm-insight-explanation", () => ({
  useUmkmInsightExplanation: () => ({ data: null, loading: false, error: null, explain: vi.fn() }),
}));

import { MerchantVisibilityPanel } from "@/src/features/umkm-workspace/components/merchant-visibility-panel";
import { MerchantOpportunityPanel } from "@/src/features/umkm-workspace/components/merchant-opportunity-panel";

function component(id: string, status: ReadinessComponent["status"]): ReadinessComponent {
  return { id, label: id, status, points: 0, max_points: 10, evidence: "" };
}

function fixture(): UmkmIntelligenceResult {
  const diagnostic = { score: 0, status: "INCOMPLETE" as const, model_version: "GETRA_DATA_READINESS_V1", components: [] };
  return {
    merchant: { id: "merchant-a", name: "Warung A", category: "Makanan", category_slug: "food", address: null, longitude: 0, latitude: 0, is_mobile: false, publish_status: "PUBLISHED", verification_status: "VERIFIED", source_evidence: [], source_freshness: "UNKNOWN", updated_at: "2026-09-01T00:00:00Z" },
    data_readiness: { ...diagnostic, components: [component("CATEGORY", "AVAILABLE"), component("OPENING_HOURS", "MISSING"), component("PRICE", "MISSING"), component("PHOTO", "MISSING"), component("MENU", "MISSING")] },
    location_readiness: { ...diagnostic, components: [component("VALID_GEOMETRY", "MISSING"), component("PEDESTRIAN_REACHABILITY", "UNAVAILABLE")] },
    visibility: { ...diagnostic, components: [component("PUBLISHED", "AVAILABLE")] },
    market_context: { status: "UNAVAILABLE", area: null, category_slug: "food", window: null, demand_score: null, supply_score: null, retail_gap: null, raw_counts: null, confidence: "UNAVAILABLE", demand_model_version: null, retail_gap_model_version: null, claim_scope: null },
    location_context: { network_status: "UNAVAILABLE", nearest_transit: null, analysis_method: "PGROUTING_NETWORK" },
    nearby_similar_merchants: [], recommendations: [], model_versions: {}, limitations: [],
  };
}

describe("Merchant visibility and opportunities", () => {
  it("turns real missing fields into actions without unsupported payment or entrance readiness", () => {
    const html = renderToStaticMarkup(<MerchantVisibilityPanel merchantId="merchant-a" intelligence={{ data: fixture(), loading: false, error: null }} />);
    expect(html).toContain("Jam operasional belum lengkap");
    expect(html).toContain("Tambahkan foto usaha");
    expect(html).toContain("Tambahkan informasi atau foto menu");
    expect(html).toContain("Metode pembayaran");
    expect(html).toContain("Pemeriksaan visibilitas belum menyediakan data metode pembayaran");
    expect(html).toContain("Data pintu masuk usaha belum tersedia");
    expect(html).not.toContain('data-testid="merchant-map"');
    expect(html).not.toMatch(/Score|Score 72|63%|AI Copilot|canonical|pgRouting/);
  });

  it("renders unavailable and limited diagnostics honestly", () => {
    expect(getReadinessPresentation(component("PEDESTRIAN_REACHABILITY", "UNAVAILABLE"))).toMatchObject({ ready: false, status: "Belum dapat diperiksa", action: null });
    expect(getReadinessPresentation(component("VALID_GEOMETRY", "LIMITED"))).toMatchObject({ ready: false, status: "Perlu diperiksa", detail: "Lokasi usaha bergerak tercatat sebagai titik pengamatan, bukan alamat permanen." });
  });

  it("does not render insights from the previous selected merchant", () => {
    const intelligence = { data: fixture(), loading: true, error: null };
    const visibility = renderToStaticMarkup(<MerchantVisibilityPanel merchantId="merchant-b" intelligence={intelligence} />);
    const opportunity = renderToStaticMarkup(<MerchantOpportunityPanel merchantId="merchant-b" intelligence={intelligence} days={30} onDaysChange={vi.fn()} />);
    expect(visibility).toContain('data-merchant-id="merchant-b"');
    expect(visibility).not.toContain("Jam operasional belum lengkap");
    expect(opportunity).not.toContain("Warung A");
    expect(opportunity).not.toContain("Jelaskan insight");
  });

  it("keeps insufficient market data unavailable and provides a truthful request-board link", () => {
    const data = fixture();
    data.market_context.status = "INSUFFICIENT_DATA";
    data.market_context.demand_score = 72;
    data.market_context.retail_gap = 40;
    const html = renderToStaticMarkup(<MerchantOpportunityPanel merchantId="merchant-a" intelligence={{ data, loading: false, error: null }} days={7} onDaysChange={vi.fn()} />);
    expect(html).toContain("Kebutuhan sekitar belum dapat disimpulkan");
    expect(html).not.toContain("Indeks kebutuhan");
    expect(html).not.toContain(">72<");
    expect(html).toContain('href="/community?view=requests"');
    expect(html).toContain("belum disaring berdasarkan lokasi usaha yang dipilih");
    expect(html).not.toContain("tidak ada pesaing langsung");
  });

  it("explains actual market observations at the backend administrative area scope", () => {
    const data = fixture();
    data.market_context = {
      ...data.market_context,
      status: "AVAILABLE",
      area: { id: "jakarta-selatan", name: "Jakarta Selatan", type: "ADMINISTRATIVE_CITY", geometry: { type: "MultiPolygon", coordinates: [] } },
      window: { start_at: "2026-08-01T00:00:00Z", end_at: "2026-08-31T00:00:00Z" },
      demand_score: 42, supply_score: 32, retail_gap: 10,
      confidence: "LIMITED_EVIDENCE",
      raw_counts: { search_events: 19, route_requests: 4, commuter_requests: 3, transaction_observations: 2, campaign_interactions: 1, canonical_merchants: 8 },
    };
    data.nearby_similar_merchants = [{ id: "similar-1", name: "Warung Tetangga", category: "Makanan", latitude: -6.2, longitude: 106.8 }];
    const html = renderToStaticMarkup(<MerchantOpportunityPanel merchantId="merchant-a" intelligence={{ data, loading: false, error: null }} days={30} onDaysChange={vi.fn()} />);
    expect(html).toContain("Ada kebutuhan yang dapat ditelusuri lebih lanjut");
    expect(html).toContain("Jakarta Selatan");
    expect(html).toContain("wilayah kota administratif");
    expect(html).toContain("Bukti masih terbatas");
    expect(html).toContain(">42<");
    expect(html).toContain("Warung Tetangga");
    expect(html).toContain("belum memastikan usaha tersebut menjadi pesaing langsung");
    expect(html).toContain("Jelaskan insight");
    expect(html).not.toContain("UMKM Copilot");
    expect(html).not.toContain("<select");
  });
});
