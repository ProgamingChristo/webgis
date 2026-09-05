import { describe, expect, it } from "vitest";
import type { BusinessSpaceCandidateDetail, BusinessSpaceComparison, BusinessSpaceInsight } from "@/src/features/business-space/types/business-space.types";
import {
  propertyComparisonMatchesRequest,
  propertyDetailMatchesRequest,
  propertyInsightMatchesRequest,
  resetPropertyRequestContext,
} from "@/src/features/business-space/hooks/use-property-analysis";

describe("Properti Go analysis context transitions", () => {
  it("clears completed detail before a different selection and reloads when the same property returns", () => {
    const completed = { key: "property-a", data: { id: "property-a" }, error: null, loading: false };
    const deselected = resetPropertyRequestContext(completed, "no-property");
    expect(deselected).toEqual({ key: "no-property", data: null, error: null, loading: false });
    const reselected = resetPropertyRequestContext(deselected, "property-a", true);
    expect(reselected).toEqual({ key: "property-a", data: null, error: null, loading: true });
  });

  it("does not resurrect the loading flag of an aborted comparison when the previous category returns", () => {
    const pending = { key: "a-b-bakso-30", data: null, error: null, loading: true };
    const otherCategory = resetPropertyRequestContext(pending, "a-b-coffee-30");
    const returnedCategory = resetPropertyRequestContext(otherCategory, "a-b-bakso-30");
    expect(returnedCategory).toEqual({ key: "a-b-bakso-30", data: null, error: null, loading: false });
  });

  it("clears old failures and AI explanations on context changes while preserving unchanged snapshots", () => {
    const failed = { key: "old", data: null, error: "Old request failed", loading: false };
    expect(resetPropertyRequestContext(failed, "current").error).toBeNull();
    const explained = { key: "old", data: "Insight from another period", error: null, loading: false };
    expect(resetPropertyRequestContext(explained, "current").data).toBeNull();
    expect(resetPropertyRequestContext(explained, "old")).toBe(explained);
  });

  it("rejects detail for a different property or category", () => {
    const detail = { candidate: { id: "property-a" }, market_context: { category_slug: "bakso" } } as BusinessSpaceCandidateDetail;
    expect(propertyDetailMatchesRequest(detail, "property-a", "bakso")).toBe(true);
    expect(propertyDetailMatchesRequest(detail, "property-b", "bakso")).toBe(false);
    expect(propertyDetailMatchesRequest(detail, "property-a", "coffee")).toBe(false);
  });

  it("requires comparison results to match the selected properties, order, category and period", () => {
    const comparison = {
      category_slug: "bakso", days: 30, candidates: [{ candidate: { id: "a" } }, { candidate: { id: "b" } }],
    } as BusinessSpaceComparison;
    expect(propertyComparisonMatchesRequest(comparison, ["a", "b"], "bakso", 30)).toBe(true);
    expect(propertyComparisonMatchesRequest(comparison, ["b", "a"], "bakso", 30)).toBe(false);
    expect(propertyComparisonMatchesRequest(comparison, ["a", "c"], "bakso", 30)).toBe(false);
    expect(propertyComparisonMatchesRequest(comparison, ["a", "b"], "coffee", 30)).toBe(false);
    expect(propertyComparisonMatchesRequest(comparison, ["a", "b"], "bakso", 7)).toBe(false);
  });

  it("requires contextual AI evidence to belong to the current comparison", () => {
    const insight = { evidence: { candidate_ids: ["a", "b"], category_slug: "bakso", days: 30 } } as BusinessSpaceInsight;
    expect(propertyInsightMatchesRequest(insight, ["a", "b"], "bakso", 30)).toBe(true);
    expect(propertyInsightMatchesRequest(insight, ["a", "c"], "bakso", 30)).toBe(false);
    expect(propertyInsightMatchesRequest(insight, ["a", "b"], "coffee", 30)).toBe(false);
    expect(propertyInsightMatchesRequest(insight, ["a", "b"], "bakso", 7)).toBe(false);
  });
});
