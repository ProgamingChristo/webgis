import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BusinessSpaceCandidateDetail } from "@/src/features/business-space/types/business-space.types";
import { freshnessLabel, PropertyCandidateDetail } from "@/src/features/business-space/components/property-candidate-detail";
import { usePropertyCandidates } from "@/src/features/business-space/hooks/use-property-candidates";
import { BusinessSpaceWorkspace } from "@/src/features/business-space/components/business-space-workspace";

vi.mock("@/src/features/business-space/hooks/use-property-candidates", () => ({ usePropertyCandidates: vi.fn() }));
vi.mock("@/src/features/business-space/hooks/use-property-analysis", () => ({
  usePropertyDetail: () => ({ detail: null, loading: false, error: null }),
  usePropertyComparison: () => ({ comparison: null, runCompare: vi.fn() }),
}));
vi.mock("@/src/features/business-space/components/business-space-map", () => ({ BusinessSpaceMap: () => <div data-testid="map" /> }));
vi.mock("@/src/features/business-space/components/business-space-chart", () => ({ BusinessSpaceChart: () => <div /> }));

function fixture(): BusinessSpaceCandidateDetail {
  return {
    candidate: { id: "property-a", source_id: "source-a", longitude: 106.8, latitude: -6.3, property_category: "Rumah", property_transaction_type: "DIJUAL", address: "Jalan Kemiri, Pondok Cabe Udik, Pamulang", facade_photo_url: null, banner_photo_url: null, observed_at: null, imported_at: null, freshness: "UNKNOWN", availability: "UNKNOWN_FRESHNESS", provenance: { provider: "MAPID", source_type: "PROPERTI_GO", source_id: "source-a", imported_at: null } },
    administrative_context: { region_id: null, region_name: null, region_type: "UNKNOWN" },
    transit_context: { status: "UNAVAILABLE", nearest: null },
    walking_context: { status: "UNAVAILABLE", catchment_minutes: 10, service_area_type: "NETWORK_SERVICE_AREA", service_area: null },
    market_context: { status: "INSUFFICIENT_DATA", category_slug: "bakso", window: null, demand_score: 100, supply_score: 100, retail_gap: 0, confidence: "INSUFFICIENT_DATA", sample_size: 0, demand_model_version: null, retail_gap_model_version: null, claim_scope: null },
    supply_context: { status: "UNAVAILABLE", category_slug: "bakso", spatial_context: "ADMINISTRATIVE_CITY", comparable_merchant_count: null, comparable_merchants: [], dedupe_basis: "canonical_merchants" },
    indicators: [], model_version: "GETRA_BUSINESS_SPACE_CONTEXT_V1", limitations: [],
  };
}

function candidateState(): ReturnType<typeof usePropertyCandidates> {
  return {
    candidates: [], totalAvailable: 0, totalIsExact: true, searchTruncated: false, hasMore: false, refineArea: false, limitations: [], loading: false, loadingMore: false, error: null,
    viewport: { west: 106.7, east: 106.8, south: -6.4, north: -6.3 }, viewportTooWide: false, onViewportChange: vi.fn(), refresh: vi.fn(), loadMore: vi.fn(),
  };
}

describe("Properti Go presentation", () => {
  beforeEach(() => vi.mocked(usePropertyCandidates).mockReturnValue(candidateState()));

  it("shows truthful empty-area guidance with no locked dashboard or fixed region filter", () => {
    const html = renderToStaticMarkup(<BusinessSpaceWorkspace />);
    expect(html).toContain("Belum ada properti di area ini");
    expect(html).toContain("Geser atau perbesar peta");
    expect(html).toContain("Jenis properti");
    expect(html).not.toMatch(/jakarta-selatan|Trade-off Matrix|AI Location Insight/);
  });

  it("does not present an incomplete filtered scan as an empty area", () => {
    vi.mocked(usePropertyCandidates).mockReturnValue({ ...candidateState(), searchTruncated: true, totalIsExact: false, refineArea: true });
    const html = renderToStaticMarkup(<BusinessSpaceWorkspace />);
    expect(html).toContain("Persempit area pencarian");
    expect(html).not.toContain("Belum ada properti di area ini");
  });

  it("asks for zoom when the viewport exceeds the existing API bounds limit", () => {
    vi.mocked(usePropertyCandidates).mockReturnValue({ ...candidateState(), viewportTooWide: true });
    const html = renderToStaticMarkup(<BusinessSpaceWorkspace />);
    expect(html).toContain("Area terlalu luas");
    expect(html).not.toContain("Belum ada properti di area ini");
  });

  it("keeps addresses inside an explicit card content column", () => {
    vi.mocked(usePropertyCandidates).mockReturnValue({ ...candidateState(), candidates: [fixture().candidate] });
    const html = renderToStaticMarkup(<BusinessSpaceWorkspace />);
    expect(html).toContain('class="bs-candidate__content"');
    expect(html).toContain('class="bs-candidate__address"');
    expect(html).toContain("Jalan Kemiri, Pondok Cabe Udik, Pamulang");
    expect(html).toContain('aria-pressed="false"');
  });

  it("hides unsupported market numbers and preserves availability caveat", () => {
    const html = renderToStaticMarkup(<PropertyCandidateDetail detail={fixture()} compared={false} comparisonFull={false} onToggle={vi.fn()} />);
    expect(html).toContain("Ketersediaan belum dikonfirmasi");
    expect(html).toContain("Data permintaan untuk wilayah ini belum cukup");
    expect(html).not.toMatch(/>100<|Skor permintaan|GETRA_BUSINESS_SPACE_CONTEXT_V1|canonical/);
    expect(freshnessLabel("STALE")).toBe("Perlu konfirmasi ulang");
  });

  it("shows actual available scores at the administrative area scope", () => {
    const detail = fixture();
    detail.market_context.status = "AVAILABLE";
    detail.market_context.demand_score = 42;
    const html = renderToStaticMarkup(<PropertyCandidateDetail detail={detail} compared={false} comparisonFull={false} onToggle={vi.fn()} />);
    expect(html).toContain(">42<");
    expect(html).toContain("Konteks tingkat wilayah");
  });

  it("limits new comparison picks to four while allowing existing picks to be removed", () => {
    const full = renderToStaticMarkup(<PropertyCandidateDetail detail={fixture()} compared={false} comparisonFull onToggle={vi.fn()} />);
    const included = renderToStaticMarkup(<PropertyCandidateDetail detail={fixture()} compared comparisonFull onToggle={vi.fn()} />);
    expect(full).toContain("Maksimal 4 properti");
    expect(full).toContain('disabled=""');
    expect(included).toContain("Hapus dari perbandingan");
    expect(included).not.toContain('disabled=""');
  });
});
