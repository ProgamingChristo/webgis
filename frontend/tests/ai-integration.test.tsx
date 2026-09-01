import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
  hookState: {} as Record<string, unknown>,
}));

vi.mock("@/src/lib/auth-client", () => ({
  authenticatedFetch: mocks.authenticatedFetch,
}));

vi.mock("@/src/hooks/use-ai", () => ({
  useAi: () => mocks.hookState,
}));

import { AiPanel } from "@/components/ai/ai-panel";
import { getGetraApiBaseUrl, getGetraApiUrl } from "@/src/lib/api-base-url";
import { AiService } from "@/src/services/ai.service";

const originalCanonicalUrl = process.env.NEXT_PUBLIC_GETRA_API_URL;
const originalDeprecatedUrl = process.env.NEXT_PUBLIC_API_URL;

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    askQuestion: vi.fn(),
    clearChat: vi.fn(),
    error: null,
    messages: [{ role: "assistant", content: "Jawaban GETRA" }],
    provider: null,
    state: "SUCCESS",
    ...overrides,
  };
}

describe("GETRA AI frontend integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GETRA_API_URL = "https://backend.example.test///";
    process.env.NEXT_PUBLIC_API_URL = "https://deprecated.example.test";
    mocks.hookState = hookState();
  });

  afterEach(() => {
    if (originalCanonicalUrl === undefined) delete process.env.NEXT_PUBLIC_GETRA_API_URL;
    else process.env.NEXT_PUBLIC_GETRA_API_URL = originalCanonicalUrl;
    if (originalDeprecatedUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalDeprecatedUrl;
  });

  it("uses the canonical backend URL and removes the trailing slash", () => {
    expect(getGetraApiBaseUrl()).toBe("https://backend.example.test");
    expect(getGetraApiUrl("/api/ai/ask")).toBe("https://backend.example.test/api/ai/ask");
    expect(getGetraApiUrl("api/ai/ask")).not.toContain("//api/ai/ask");
  });

  it("fails clearly when neither frontend backend-URL variable is configured", () => {
    delete process.env.NEXT_PUBLIC_GETRA_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(() => getGetraApiBaseUrl()).toThrow("NEXT_PUBLIC_GETRA_API_URL belum dikonfigurasi");
  });

  it("preserves truthful provider metadata from a successful AI response", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        answer: "Ya, saya Asisten GETRA AI.",
        evidence: [],
        intent: "ASSISTANT_IDENTITY",
        limitations: [],
        provider: "sub2api",
      },
    }), { status: 200 }));

    await expect(AiService.askQuestion({ question: "kamu asisten aku kan?" })).resolves.toMatchObject({
      provider: "sub2api",
    });
    expect(mocks.authenticatedFetch).toHaveBeenCalledWith(
      "https://backend.example.test/api/ai/ask",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces provider errors instead of manufacturing a fallback response", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: {
        code: "AI_PROVIDER_TIMEOUT",
        message: "Provider AI tidak merespons tepat waktu. Silakan coba lagi.",
      },
    }), { status: 504 }));

    await expect(AiService.askQuestion({ question: "Apa kondisi area ini?" }))
      .rejects.toThrow("Provider AI tidak merespons tepat waktu");
  });

  it("shows an AI-connected status only after a Sub2API success", () => {
    mocks.hookState = hookState({ provider: "sub2api" });
    const html = renderToStaticMarkup(<AiPanel activeExperience="GENERAL" />);
    expect(html).toContain("AI terhubung");
    expect(html).toContain("interpretasi AI");
    expect(html).not.toContain("Mode fallback data");
  });

  it("labels deterministic mode and does not claim the answer was interpreted by AI", () => {
    mocks.hookState = hookState({ provider: "deterministic" });
    const html = renderToStaticMarkup(<AiPanel activeExperience="GENERAL" />);
    expect(html).toContain("Mode fallback data");
    expect(html).toContain("tanpa interpretasi AI");
    expect(html).not.toContain("AI terhubung");
  });

  it("renders a safe error state with no active-provider badge", () => {
    mocks.hookState = hookState({
      error: "Provider AI sementara tidak tersedia.",
      messages: [],
      provider: null,
      state: "ERROR",
    });
    const html = renderToStaticMarkup(<AiPanel activeExperience="GENERAL" />);
    expect(html).toContain("GETRA AI belum bisa menjawab");
    expect(html).toContain("Provider AI sementara tidak tersedia");
    expect(html).not.toContain("AI terhubung");
  });
});
