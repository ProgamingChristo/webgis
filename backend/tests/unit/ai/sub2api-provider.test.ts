import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { sub2ApiProvider } from "@/lib/ai/sub2api";

const originalFetch = globalThis.fetch;
const originalKey = process.env.SUB2API_API_KEY;
const originalModel = process.env.SUB2API_MODEL;
const originalBaseUrl = process.env.SUB2API_BASE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalKey === undefined) delete process.env.SUB2API_API_KEY;
  else process.env.SUB2API_API_KEY = originalKey;

  if (originalModel === undefined) delete process.env.SUB2API_MODEL;
  else process.env.SUB2API_MODEL = originalModel;

  if (originalBaseUrl === undefined) delete process.env.SUB2API_BASE_URL;
  else process.env.SUB2API_BASE_URL = originalBaseUrl;

  vi.restoreAllMocks();
});

describe("Sub2API provider", () => {
  it("uses the Responses-compatible endpoint with server-side key and strict structured output", async () => {
    const requests: Array<{
      url: string;
      headers: HeadersInit | undefined;
      body: any;
    }> = [];

    process.env.SUB2API_API_KEY = "test-sub2api-key";
    process.env.SUB2API_MODEL = "claude-sonnet-4-6";
    process.env.SUB2API_BASE_URL = "https://api.mwapi.dev/v1";

    globalThis.fetch = vi.fn(async (url, init) => {
      requests.push({
        url: String(url),
        headers: init?.headers,
        body: JSON.parse(String(init?.body)),
      });

      return new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({ ok: true }),
                },
              ],
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }) as typeof fetch;

    const schema = z.object({
      ok: z.boolean(),
    });

    await expect(
      sub2ApiProvider.generateStructured({
        input: "test",
        instructions: "return json",
        maxTokens: 700,
        schema,
        schemaName: "test_schema",
      }),
    ).resolves.toEqual({ ok: true });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.mwapi.dev/v1/responses");
    expect(requests[0].headers).toMatchObject({
      Authorization: "Bearer test-sub2api-key",
      "Content-Type": "application/json",
    });
    expect(requests[0].body).toMatchObject({
      input: "test",
      instructions: "return json",
      max_output_tokens: 700,
      model: "claude-sonnet-4-6",
      store: false,
      text: {
        format: {
          name: "test_schema",
          strict: true,
          type: "json_schema",
        },
      },
    });
  });
});
