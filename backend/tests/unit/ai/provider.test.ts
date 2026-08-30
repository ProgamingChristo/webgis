import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claudeConfigured: vi.fn(),
  claudeGenerate: vi.fn(),
  openaiConfigured: vi.fn(),
  openaiGenerate: vi.fn(),
  sub2apiConfigured: vi.fn(),
  sub2apiGenerate: vi.fn(),
}));

vi.mock("@/lib/ai/anthropic", () => ({
  anthropicProvider: {
    id: "claude",
    isConfigured: mocks.claudeConfigured,
    generateStructured: mocks.claudeGenerate,
  },
}));

vi.mock("@/lib/ai/openai", () => ({
  openAIProvider: {
    id: "openai",
    isConfigured: mocks.openaiConfigured,
    generateStructured: mocks.openaiGenerate,
  },
}));

vi.mock("@/lib/ai/sub2api", () => ({
  sub2ApiProvider: {
    id: "sub2api",
    isConfigured: mocks.sub2apiConfigured,
    generateStructured: mocks.sub2apiGenerate,
  },
}));

import { generateStructured, getConfiguredProvider } from "@/lib/ai/provider";

const schema = z.object({
  ok: z.boolean(),
});

describe("AI provider selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_PROVIDER;
    mocks.claudeConfigured.mockReturnValue(false);
    mocks.openaiConfigured.mockReturnValue(false);
    mocks.sub2apiConfigured.mockReturnValue(false);
  });

  it("uses Claude canonically when AI_PROVIDER=claude", async () => {
    process.env.AI_PROVIDER = "claude";
    mocks.claudeConfigured.mockReturnValue(true);
    mocks.openaiConfigured.mockReturnValue(true);
    mocks.claudeGenerate.mockResolvedValue({ ok: true });

    await expect(
      generateStructured({
        input: "test",
        instructions: "return json",
        schema,
        schemaName: "test_schema",
      }),
    ).resolves.toEqual({
      data: { ok: true },
      source: "claude",
    });

    expect(mocks.claudeGenerate).toHaveBeenCalledTimes(1);
    expect(mocks.openaiGenerate).not.toHaveBeenCalled();
    expect(mocks.sub2apiGenerate).not.toHaveBeenCalled();
    expect(getConfiguredProvider()).toBe("claude");
  });

  it("does not silently fallback when canonical Claude fails", async () => {
    process.env.AI_PROVIDER = "claude";
    mocks.claudeConfigured.mockReturnValue(true);
    mocks.openaiConfigured.mockReturnValue(true);
    mocks.claudeGenerate.mockRejectedValue(new Error("provider failed"));

    await expect(
      generateStructured({
        input: "test",
        instructions: "return json",
        schema,
        schemaName: "test_schema",
      }),
    ).rejects.toThrow("provider failed");

    expect(mocks.claudeGenerate).toHaveBeenCalledTimes(1);
    expect(mocks.openaiGenerate).not.toHaveBeenCalled();
    expect(mocks.sub2apiGenerate).not.toHaveBeenCalled();
  });

  it("uses Sub2API canonically when AI_PROVIDER=sub2api", async () => {
    process.env.AI_PROVIDER = "sub2api";
    mocks.claudeConfigured.mockReturnValue(true);
    mocks.openaiConfigured.mockReturnValue(true);
    mocks.sub2apiConfigured.mockReturnValue(true);
    mocks.sub2apiGenerate.mockResolvedValue({ ok: true });

    await expect(
      generateStructured({
        input: "test",
        instructions: "return json",
        schema,
        schemaName: "test_schema",
      }),
    ).resolves.toEqual({
      data: { ok: true },
      source: "sub2api",
    });

    expect(mocks.sub2apiGenerate).toHaveBeenCalledTimes(1);
    expect(mocks.claudeGenerate).not.toHaveBeenCalled();
    expect(mocks.openaiGenerate).not.toHaveBeenCalled();
    expect(getConfiguredProvider()).toBe("sub2api");
  });

  it("keeps explicit fallback behavior only when no canonical provider is configured", async () => {
    mocks.openaiConfigured.mockReturnValue(true);
    mocks.openaiGenerate.mockResolvedValue({ ok: true });

    await expect(
      generateStructured({
        input: "test",
        instructions: "return json",
        schema,
        schemaName: "test_schema",
      }),
    ).resolves.toEqual({
      data: { ok: true },
      source: "openai",
    });

    expect(mocks.openaiGenerate).toHaveBeenCalledTimes(1);
    expect(mocks.claudeGenerate).not.toHaveBeenCalled();
    expect(mocks.sub2apiGenerate).not.toHaveBeenCalled();
  });
});
