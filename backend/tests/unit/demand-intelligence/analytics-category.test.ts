import { describe, expect, it } from "vitest";
import { resolveAnalyticsCategory } from "@/src/features/demand-intelligence";

describe("Phase 09 deterministic category taxonomy", () => {
  it.each([
    ["bakso Jakarta Selatan", "bakso"],
    ["Nasi Goreng", "nasi-goreng"],
    ["Kopi Kenangan", "coffee"],
    ["Warung/Tenda", "warung"],
    ["Kaki Lima/Gerobak", "street-food"],
    ["Minimarket/supermarket", "minimarket"],
    ["Apotek", "pharmacy"],
  ])("maps %s to %s", (input, expected) => {
    expect(resolveAnalyticsCategory(input)).toBe(expected);
  });

  it("does not invent a category for unrelated text", () => {
    expect(resolveAnalyticsCategory("kategori tidak dikenal")).toBeNull();
  });
});
