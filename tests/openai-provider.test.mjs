import assert from "node:assert/strict";
import test from "node:test";

test("uses OpenAI structured outputs for intent and grounded explanation", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;
  const requests = [];

  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  });

  process.env.OPENAI_API_KEY = "test-only-key";
  process.env.OPENAI_MODEL = "gpt-5-mini";
  globalThis.fetch = async (url, init) => {
    const request = JSON.parse(init.body);
    requests.push({ url: String(url), ...request });
    const schemaName = request.text.format.name;
    const output = schemaName === "getra_search_intent"
      ? {
          stakeholder: "commuter",
          originName: "Stasiun Dukuh Atas",
          category: "kopi",
          maxWalkingMinutes: 8,
          priceLevel: "hemat",
          openNow: false,
          accessibilityNeeds: [],
          sortBy: "best_match",
        }
      : {
          summary: "Satu kandidat sesuai hasil pencarian terstruktur.",
          limitation: "Data yang digunakan masih sintetis.",
        };

    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(output) }],
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("openai-provider-test", `${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/ai/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "Cari kopi murah maksimal 8 menit", stakeholder: "commuter" }),
    }),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.execution.intentSource, "openai");
  assert.equal(body.execution.explanationSource, "openai");
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.url, "https://api.openai.com/v1/responses");
    assert.equal(request.model, "gpt-5-mini");
    assert.equal(request.store, false);
    assert.equal(request.text.format.type, "json_schema");
    assert.equal(request.text.format.strict, true);
    assert.doesNotMatch(
      JSON.stringify(request.text.format.schema),
      /"(?:\$schema|default|minimum|maximum|minLength|maxLength)"/,
    );
  }
});
