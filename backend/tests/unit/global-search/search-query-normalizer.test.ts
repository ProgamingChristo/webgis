import { describe, expect, it } from "vitest";
import { normalizeQueryText, resolveSearchQuery } from "@/src/features/global-search/search-query-normalizer";

describe("search query normalization", () => {
  it.each([
    ["basko", "bakso", "HIGH_FUZZY"],
    ["baso", "bakso", "ALIAS"],
    ["nasgor", "nasi goreng", "ALIAS"],
    ["mi goreng", "mie goreng", "ALIAS"],
    ["nasi greng", "nasi goreng", "HIGH_FUZZY"],
    ["rendnag", "rendang", "HIGH_FUZZY"],
  ])("resolves %s to %s", (input, canonical, confidence) => {
    expect(resolveSearchQuery(input)).toMatchObject({ canonical, correction: canonical, confidence });
  });

  it("normalizes Unicode, punctuation, case, and whitespace", () => {
    expect(normalizeQueryText("  SOTO,  MIÉ!! ")).toBe("soto mie");
  });

  it.each(["bengkel sepeda", "apotik 24 jam", "blok e", "xyzq"])(
    "does not aggressively correct unrelated query %s",
    (input) => {
      expect(resolveSearchQuery(input)).toMatchObject({ canonical: normalizeQueryText(input), correction: null });
    },
  );
});

