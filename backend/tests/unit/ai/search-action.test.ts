import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ generateStructured: mocks.generate }));
import { AiService } from "@/src/modules/ai/ai.service";
import { SearchCriteriaSchema } from "@/src/modules/ai/search-action";

const criteria = { query: "bakso", max_budget: 15000, open_now: false, max_walking_minutes: null,
  reference_text: "Stasiun Manggarai", near_user: false, radius_meters: 1000, sort: "NEAREST" as const };

describe("AI search actions", () => {
  it("returns validated criteria using the unified action contract without fabricated results", async () => {
    mocks.generate.mockReset().mockResolvedValue({ source: "openai", data: { action: "SEARCH", criteria, clarification: "" } });
    const response = await new AiService("Bearer fixture").handleAskRequest({ question: "Bakso dekat Stasiun Manggarai budget 15000", active_experience: "GENERAL", context: { enable_search: true } });
    expect(response.action).toEqual({ type: "APPLY_SEARCH_CRITERIA", criteria });
    expect(response.answer).not.toContain("sudah menampilkan");
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(response).not.toHaveProperty("merchants");
  });

  it("preserves an explicit Jakarta administrative region for the canonical region parser", async () => {
    mocks.generate.mockReset().mockResolvedValue({
      source: "openai",
      data: {
        action: "SEARCH",
        criteria: {
          query: "bakso",
          max_budget: 15000,
          open_now: false,
          max_walking_minutes: null,
          reference_text: null,
          near_user: false,
          radius_meters: null,
          sort: "RELEVANCE",
        },
        clarification: "",
      },
    });

    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "cari bakso budget 15 ribu di jakpus",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });

    expect(response.action).toMatchObject({
      type: "APPLY_SEARCH_CRITERIA",
      criteria: { query: "bakso Jakarta Pusat" },
    });
  });

  it("asks for location instead of applying near-me without GPS", async () => {
    mocks.generate.mockReset().mockResolvedValue({ source: "openai", data: { action: "SEARCH", criteria: { ...criteria, reference_text: null, near_user: true }, clarification: "" } });
    const response = await new AiService("Bearer fixture").handleAskRequest({ question: "Bakso dekat saya", active_experience: "GENERAL", context: { enable_search: true } });
    expect(response.action?.type).toBe("REQUEST_CLARIFICATION");
    expect(response.answer).toContain("Aktifkan lokasi");
  });

  it("rejects model-added coordinates, invalid budgets and manufactured merchant data", () => {
    expect(SearchCriteriaSchema.safeParse({ ...criteria, merchants: [{ name: "Fake" }] }).success).toBe(false);
    expect(SearchCriteriaSchema.safeParse({ ...criteria, max_budget: -1 }).success).toBe(false);
    expect(SearchCriteriaSchema.safeParse({ ...criteria, latitude: -6 }).success).toBe(false);
  });
});
