import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sub2apiConfigured: vi.fn(),
  sub2apiGenerate: vi.fn(),
}));

vi.mock("@/lib/ai/sub2api", () => ({
  sub2ApiProvider: {
    id: "sub2api",
    isConfigured: mocks.sub2apiConfigured,
    generateStructured: mocks.sub2apiGenerate,
  },
}));

import { generateStructured, getConfiguredProvider } from "@/lib/ai/provider";
import { AiProviderError } from "@/src/lib/errors";

const originalProvider = process.env.AI_PROVIDER;
const schema = z.object({ ok: z.boolean() });
const request = {
  input: "test",
  instructions: "return json",
  schema,
  schemaName: "test_schema",
};

describe("AI provider selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_PROVIDER;
    mocks.sub2apiConfigured.mockReturnValue(false);
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
  });

  it("uses deterministic mode without probing paid providers when AI_PROVIDER is unset", async () => {
    mocks.sub2apiConfigured.mockReturnValue(true);

    await expect(generateStructured(request)).resolves.toBeNull();
    expect(getConfiguredProvider()).toBe("fallback");
    expect(mocks.sub2apiGenerate).not.toHaveBeenCalled();
  });

  it("uses Sub2API exclusively when AI_PROVIDER=sub2api", async () => {
    process.env.AI_PROVIDER = "sub2api";
    mocks.sub2apiConfigured.mockReturnValue(true);
    mocks.sub2apiGenerate.mockResolvedValue({ ok: true });

    await expect(generateStructured(request)).resolves.toEqual({
      data: { ok: true },
      source: "sub2api",
    });
    expect(getConfiguredProvider()).toBe("sub2api");
    expect(mocks.sub2apiGenerate).toHaveBeenCalledTimes(1);
  });

  it("throws a typed configuration error when explicit Sub2API has no key", async () => {
    process.env.AI_PROVIDER = "sub2api";
    mocks.sub2apiConfigured.mockReturnValue(false);

    const result = generateStructured(request);
    await expect(result).rejects.toBeInstanceOf(AiProviderError);
    await expect(result).rejects.toMatchObject({
      category: "configuration",
      code: "AI_PROVIDER_CONFIGURATION",
      provider: "sub2api",
    });
    expect(mocks.sub2apiGenerate).not.toHaveBeenCalled();
  });

  it("propagates explicit Sub2API failures without deterministic fallback", async () => {
    process.env.AI_PROVIDER = "sub2api";
    mocks.sub2apiConfigured.mockReturnValue(true);
    const providerError = new AiProviderError({
      category: "unavailable",
      provider: "sub2api",
      upstreamStatus: 503,
    });
    mocks.sub2apiGenerate.mockRejectedValue(providerError);

    await expect(generateStructured(request)).rejects.toBe(providerError);
    expect(mocks.sub2apiGenerate).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported legacy paid-provider modes", async () => {
    process.env.AI_PROVIDER = "claude";
    await expect(generateStructured(request)).rejects.toMatchObject({
      code: "AI_PROVIDER_CONFIGURATION",
    });
    expect(mocks.sub2apiGenerate).not.toHaveBeenCalled();
  });
});
