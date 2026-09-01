import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sub2ApiProvider } from "@/lib/ai/sub2api";
import { AiProviderError } from "@/src/lib/errors";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
  SUB2API_API_KEY: process.env.SUB2API_API_KEY,
  SUB2API_BASE_URL: process.env.SUB2API_BASE_URL,
  SUB2API_MODEL: process.env.SUB2API_MODEL,
  SUB2API_TIMEOUT_MS: process.env.SUB2API_TIMEOUT_MS,
};

const schema = z.object({ ok: z.boolean() });
const request = {
  input: "test",
  instructions: "return json",
  maxTokens: 700,
  schema,
  schemaName: "test_schema",
};

function successResponse(output: unknown = { ok: true }): Response {
  return new Response(JSON.stringify({
    output: [{
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(output) }],
    }],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Sub2API provider", () => {
  beforeEach(() => {
    process.env.SUB2API_API_KEY = "unit-test-placeholder";
    process.env.SUB2API_BASE_URL = "https://api.mwapi.dev/v1";
    process.env.SUB2API_MODEL = "claude-sonnet-4-6";
    process.env.SUB2API_TIMEOUT_MS = "12000";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    vi.restoreAllMocks();
  });

  it("posts a prompt-structured request compatible with the Anthropic Responses gateway", async () => {
    const requests: Array<{ url: string; headers: HeadersInit | undefined; body: Record<string, unknown> }> = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      requests.push({
        url: String(url),
        headers: init?.headers,
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return successResponse();
    }) as typeof fetch;

    await expect(sub2ApiProvider.generateStructured(request)).resolves.toEqual({ ok: true });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.mwapi.dev/v1/responses");
    expect(requests[0].headers).toMatchObject({
      Authorization: "Bearer unit-test-placeholder",
      "Content-Type": "application/json",
    });
    expect(requests[0].body).toMatchObject({
      input: "test",
      max_output_tokens: 700,
      model: "claude-sonnet-4-6",
      store: false,
    });
    expect(requests[0].body).not.toHaveProperty("text");
    expect(requests[0].body.instructions).toEqual(expect.stringContaining("return json"));
    expect(requests[0].body.instructions).toEqual(expect.stringContaining("OUTPUT CONTRACT"));
    expect(requests[0].body.instructions).toEqual(expect.stringContaining('"ok"'));
    expect(requests[0].body.instructions).toEqual(expect.stringContaining("Do not wrap the JSON"));
  });

  it.each([
    [400, "AI_PROVIDER_UPSTREAM", "upstream"],
    [401, "AI_PROVIDER_UPSTREAM", "upstream"],
    [403, "AI_PROVIDER_UPSTREAM", "upstream"],
    [404, "AI_PROVIDER_UPSTREAM", "upstream"],
    [408, "AI_PROVIDER_UNAVAILABLE", "unavailable"],
    [429, "AI_PROVIDER_UNAVAILABLE", "unavailable"],
    [500, "AI_PROVIDER_UNAVAILABLE", "unavailable"],
  ])("maps upstream HTTP %i to a typed provider error", async (status, code, category) => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      error: { code: "UPSTREAM_FAILURE", message: "Safe upstream failure" },
    }), { status })) as typeof fetch;

    await expect(sub2ApiProvider.generateStructured(request)).rejects.toMatchObject({
      category,
      code,
      provider: "sub2api",
      upstreamCode: "UPSTREAM_FAILURE",
      upstreamMessage: "Safe upstream failure",
      upstreamStatus: status,
    });
  });

  it("maps timeout without exposing the server credential", async () => {
    const timeout = new Error("request included unit-test-placeholder");
    timeout.name = "TimeoutError";
    globalThis.fetch = vi.fn(async () => { throw timeout; }) as typeof fetch;

    let thrown: unknown;
    try {
      await sub2ApiProvider.generateStructured(request);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AiProviderError);
    expect(thrown).toMatchObject({
      category: "timeout",
      code: "AI_PROVIDER_TIMEOUT",
    });
    expect(String(thrown)).not.toContain("unit-test-placeholder");
  });

  it("redacts the configured credential if an upstream diagnostic echoes it", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: "AUTH_unit-test-placeholder",
        message: "Rejected Bearer unit-test-placeholder",
      },
    }), { status: 401 })) as typeof fetch;

    await expect(sub2ApiProvider.generateStructured(request)).rejects.toMatchObject({
      upstreamCode: "AUTH_[REDACTED]",
      upstreamMessage: "Rejected Bearer [REDACTED]",
    });
  });

  it("maps network failures to temporary unavailability", async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError("network down"); }) as typeof fetch;
    await expect(sub2ApiProvider.generateStructured(request)).rejects.toMatchObject({
      category: "unavailable",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
  });

  it.each([
    ["malformed JSON", new Response("not-json", { status: 200 })],
    ["missing output_text", new Response(JSON.stringify({ output: [] }), { status: 200 })],
    ["empty output_text", new Response(JSON.stringify({ output_text: "" }), { status: 200 })],
    ["invalid structured JSON", new Response(JSON.stringify({ output_text: "{" }), { status: 200 })],
    ["schema mismatch", successResponse({ ok: "yes" })],
  ])("rejects %s as an invalid provider response", async (_label, response) => {
    globalThis.fetch = vi.fn(async () => response) as typeof fetch;
    await expect(sub2ApiProvider.generateStructured(request)).rejects.toMatchObject({
      category: "invalid_response",
      code: "AI_PROVIDER_INVALID_RESPONSE",
      provider: "sub2api",
    });
  });

  it("rejects missing key and invalid timeout as safe configuration errors", async () => {
    delete process.env.SUB2API_API_KEY;
    await expect(sub2ApiProvider.generateStructured(request)).rejects.toMatchObject({
      code: "AI_PROVIDER_CONFIGURATION",
    });

    process.env.SUB2API_API_KEY = "unit-test-placeholder";
    process.env.SUB2API_TIMEOUT_MS = "30000";
    await expect(sub2ApiProvider.generateStructured(request)).rejects.toMatchObject({
      code: "AI_PROVIDER_CONFIGURATION",
    });
  });
});
