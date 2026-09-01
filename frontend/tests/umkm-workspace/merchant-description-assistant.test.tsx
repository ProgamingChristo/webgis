import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock("@/src/lib/auth-client", () => ({
  authenticatedFetch: mocks.authenticatedFetch,
}));

import {
  MERCHANT_DESCRIPTION_ACTIONS,
  MerchantDescriptionAssistant,
  getMerchantDescriptionAssistantLabel,
} from "@/src/features/merchant-submission/components/merchant-description-assistant";
import { AiService } from "@/src/services/ai.service";

const originalApiUrl = process.env.NEXT_PUBLIC_GETRA_API_URL;

describe("Merchant description AI assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GETRA_API_URL = "https://backend.example.test";
  });

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_GETRA_API_URL;
    else process.env.NEXT_PUBLIC_GETRA_API_URL = originalApiUrl;
  });

  it("renders a compact accessible trigger inside the empty textarea", () => {
    const html = renderToStaticMarkup(
      <MerchantDescriptionAssistant
        businessName="Warung GETRA"
        category="Makanan & Minuman"
        id="merchant-description-test"
        onChange={vi.fn()}
        priceRange={null}
        value=""
      />,
    );

    expect(html).toContain("Bantu tulis dengan AI");
    expect(html).toContain("aria-haspopup=\"dialog\"");
    expect(html).toContain("type=\"button\"");
    expect(html).toContain("bottom-3 right-6");
    expect(html).toContain("Contoh: Warung kopi lokal");
    expect(html).toContain("maxLength=\"1500\"");
    expect(html).not.toMatch(/api\.mwapi\.dev|SUB2API|Authorization/);
  });

  it("switches the tooltip and exposes all four non-destructive editing modes", () => {
    const html = renderToStaticMarkup(
      <MerchantDescriptionAssistant
        businessName="Warung GETRA"
        category="Makanan & Minuman"
        id="merchant-description-existing"
        onChange={vi.fn()}
        priceRange="BUDGET"
        value="Warung menjual kopi."
      />,
    );

    expect(html).toContain("Perbaiki dengan AI");
    expect(html).toContain("aria-haspopup=\"menu\"");
    expect(MERCHANT_DESCRIPTION_ACTIONS).toEqual([
      { mode: "improve", label: "Perbaiki tulisan" },
      { mode: "engaging", label: "Buat lebih menarik" },
      { mode: "shorten", label: "Buat lebih singkat" },
      { mode: "proofread", label: "Rapikan bahasa" },
    ]);
    expect(getMerchantDescriptionAssistantLabel("  ")).toBe("Bantu tulis dengan AI");
  });

  it("calls only the authenticated GETRA backend and returns its clean contract", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { description: "Warung lokal menyediakan kopi dan teh." },
    }), { status: 200 }));

    await expect(AiService.assistMerchantDescription({
      mode: "generate",
      businessName: "Warung GETRA",
      category: "Makanan & Minuman",
      products: "kopi dan teh",
      description: "",
    })).resolves.toEqual({
      description: "Warung lokal menyediakan kopi dan teh.",
    });

    expect(mocks.authenticatedFetch).toHaveBeenCalledWith(
      "https://backend.example.test/api/ai/merchant-description",
      expect.objectContaining({ method: "POST" }),
    );
    const request = mocks.authenticatedFetch.mock.calls[0][1];
    expect(request.body).not.toMatch(/systemPrompt|api[_-]?key|api\.mwapi\.dev/i);
  });

  it("maps provider failures to a short UI-safe error", async () => {
    mocks.authenticatedFetch.mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: "AI_PROVIDER_TIMEOUT", message: "Internal provider detail" },
    }), { status: 504 }));

    await expect(AiService.assistMerchantDescription({
      mode: "improve",
      description: "Warung menjual teh.",
    })).rejects.toThrow("Gagal membuat deskripsi. Coba lagi.");
  });
});
