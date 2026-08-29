import { describe, expect, it } from "vitest";

import {
  normalizeIdrAmount,
  parseDeterministicCommuterText,
  parseObservedPrice,
} from "@/src/features/commuter";

describe("deterministic commuter intent", () => {
  it.each([
    ["bakso di bawah 30 ribu", "bakso", 30_000],
    ["bakso 30rb", "bakso", 30_000],
    ["bakso Rp30.000", "bakso", 30_000],
    ["mie ayam 20 ribuan Jakarta Barat", "mie ayam Jakarta Barat", 20_000],
  ])("normalizes Indonesian budget form %s", (text, keyword, budget) => {
    const parsed = parseDeterministicCommuterText(text);
    expect(parsed.keyword_text).toBe(keyword);
    expect(parsed.constraints.budget?.max_idr).toBe(budget);
  });

  it("parses combined constraints without needing AI", () => {
    const parsed = parseDeterministicCommuterText(
      "bakso 30 ribu buka sekarang maksimal 10 menit jalan kaki",
    );
    expect(parsed).toMatchObject({
      keyword_text: "bakso",
      confidence: "HIGH",
      constraints: {
        budget: { max_idr: 30_000 },
        opening: { open_now: true, timezone: "Asia/Jakarta" },
        walking: { max_minutes: 10 },
      },
    });
  });

  it("leaves a simple keyword unchanged", () => {
    expect(parseDeterministicCommuterText("bakso")).toMatchObject({
      keyword_text: "bakso",
      constraints: { budget: null, opening: null, walking: null },
    });
  });

  it("rejects invalid and unsafe price values", () => {
    expect(normalizeIdrAmount("0", "rb")).toBeNull();
    expect(normalizeIdrAmount("999999999", "rb")).toBeNull();
    expect(parseObservedPrice(null)).toBeNull();
    expect(parseObservedPrice("tidak diketahui")).toBeNull();
    expect(parseObservedPrice("Rp30.000")).toBe(30_000);
  });
});
