import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ generateStructured: mocks.generate }));
import { AiService } from "@/src/modules/ai/ai.service";
import { SearchCriteriaSchema } from "@/src/modules/ai/search-action";

const criteria = { query: "bakso", max_budget: 15000, open_now: false, max_walking_minutes: null,
  reference_text: "Stasiun Manggarai", near_user: false, radius_meters: 1000, sort: "NEAREST" };

describe("AI search actions", () => {
  it("returns validated criteria using one extraction call, without fabricated results or success claims", async () => {
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

  it("searches a short category and region phrase when the model provider is disabled", async () => {
    mocks.generate.mockReset().mockResolvedValue(null);

    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "bakso di jakarta pusat",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });

    expect(response).toMatchObject({
      intent: "MERCHANT_SEARCH",
      provider: "deterministic",
      action: {
        type: "APPLY_SEARCH_CRITERIA",
        criteria: {
          query: "bakso Jakarta Pusat",
          max_budget: null,
          near_user: false,
          sort: "RELEVANCE",
        },
      },
    });
  });

  it("keeps a grounded search usable when the configured model provider is unavailable", async () => {
    mocks.generate.mockReset().mockRejectedValue(new Error("provider unavailable"));

    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "bakso di jakarta pusat",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });

    expect(response).toMatchObject({
      provider: "deterministic",
      action: {
        type: "APPLY_SEARCH_CRITERIA",
        criteria: { query: "bakso Jakarta Pusat" },
      },
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

  it("deterministically extracts transit reference for 'umkm di dekat stasiun manggarai'", async () => {
    mocks.generate.mockReset().mockResolvedValue(null);
    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "umkm di dekat stasiun manggarai",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });
    expect(response).toMatchObject({
      intent: "MERCHANT_SEARCH",
      provider: "deterministic",
      action: {
        type: "APPLY_SEARCH_CRITERIA",
        criteria: {
          query: "",
          reference_text: "Stasiun Manggarai",
          radius_meters: 1000,
          sort: "NEAREST",
        },
      },
    });
  });

  it("deterministically extracts transit reference for 'umkm dekat stasiun tanah abang'", async () => {
    mocks.generate.mockReset().mockResolvedValue(null);
    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "umkm dekat stasiun tanah abang",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });
    expect(response).toMatchObject({
      intent: "MERCHANT_SEARCH",
      provider: "deterministic",
      action: {
        type: "APPLY_SEARCH_CRITERIA",
        criteria: {
          query: "",
          reference_text: "Stasiun Tanah Abang",
          radius_meters: 1000,
          sort: "NEAREST",
        },
      },
    });
  });

  it("extracts food keyword and transit reference for 'cari kopi dekat manggarai'", async () => {
    mocks.generate.mockReset().mockResolvedValue(null);
    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "cari kopi dekat manggarai",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });
    expect(response).toMatchObject({
      intent: "MERCHANT_SEARCH",
      provider: "deterministic",
      action: {
        type: "APPLY_SEARCH_CRITERIA",
        criteria: {
          query: "kopi",
          reference_text: "Stasiun Manggarai",
          radius_meters: 1000,
          sort: "NEAREST",
        },
      },
    });
  });

  it("requests clarification for unnamed transit like 'cari kuliner dekat stasiun'", async () => {
    mocks.generate.mockReset().mockResolvedValue(null);
    const response = await new AiService("Bearer fixture").handleAskRequest({
      question: "cari kuliner dekat stasiun",
      active_experience: "GENERAL",
      context: { enable_search: true },
    });
    expect(response.action?.type).toBe("REQUEST_CLARIFICATION");
    expect(response.answer).toContain("Sebutkan nama stasiun atau halte");
  });
});
