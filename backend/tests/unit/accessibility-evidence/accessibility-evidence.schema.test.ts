import { describe, expect, it } from "vitest";

import {
  accessibilityEvidenceIdSchema,
  accessibilityEvidenceQuerySchema,
  accessibilityReviewRequestSchema,
} from "@/src/features/accessibility-evidence";

describe("accessibility evidence schemas", () => {
  it("accepts bounded viewport filters", () => {
    expect(
      accessibilityEvidenceQuerySchema.parse({
        west: "106.7",
        south: "-6.3",
        east: "106.9",
        north: "-6.1",
        category: "ACCESSIBILITY_OBSERVATION",
        source_type: "MAPID_ACTIVITY",
        validation_status: "OBSERVED",
        days: "90",
      }),
    ).toMatchObject({
      category: "ACCESSIBILITY_OBSERVATION",
      limit: 100,
      offset: 0,
      source_type: "MAPID_ACTIVITY",
    });
  });

  it("rejects unsafe source, status, and oversized bbox inputs", () => {
    expect(() =>
      accessibilityEvidenceQuerySchema.parse({
        west: "100",
        south: "-10",
        east: "120",
        north: "10",
        source_type: "/web/competition/activities",
      }),
    ).toThrow();
  });

  it("keeps evidence IDs source-scoped", () => {
    expect(accessibilityEvidenceIdSchema.parse("MAPID_ACTIVITY:abc-123")).toBe(
      "MAPID_ACTIVITY:abc-123",
    );
    expect(() => accessibilityEvidenceIdSchema.parse("../../secret")).toThrow();
  });

  it("accepts admin review without enabling routing effects", () => {
    expect(
      accessibilityReviewRequestSchema.parse({
        validation_status: "NEEDS_REVIEW",
        confirmed_category: "ACCESSIBILITY_OBSERVATION",
        confirmed_subcategory: "SIDEWALK",
        relation_status: "CANDIDATE",
      }),
    ).toMatchObject({
      validation_status: "NEEDS_REVIEW",
      relation_status: "CANDIDATE",
    });
  });
});
