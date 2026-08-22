import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("ai-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

async function search(worker, payload) {
  return worker.fetch(
    new Request("http://localhost/api/ai/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    {},
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function rawSearch(worker, { body, headers = {} }) {
  return worker.fetch(
    new Request("http://localhost/api/ai/search", {
      method: "POST",
      headers,
      body,
    }),
    {},
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("runs the grounded AI search vertical slice", async () => {
  const worker = await loadWorker();
  const response = await search(worker, {
    query: "Cari kopi murah maksimal 8 menit dari stasiun dan buka sekarang",
    stakeholder: "commuter",
  });

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.intent.category, "kopi");
  assert.equal(body.intent.maxWalkingMinutes, 8);
  assert.equal(body.execution.tool.name, "search_merchants");
  assert.equal(body.execution.tool.adapter, "demo-merchants");
  assert.equal(body.execution.dataMode, "synthetic");
  assert.equal(body.execution.provenance.quality, "synthetic");
  assert.equal(body.execution.tool.resultCount, body.results.length);
  assert.ok(body.results.length > 0);
  assert.ok(body.explanation.length > 0);
  assert.ok(body.limitations.some((item) => item.includes("data sintetis")));
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.ok(response.headers.get("x-request-id"));
  assert.equal(response.headers.get("ratelimit-limit"), "12");
});

test("returns a grounded empty result without inventing candidates", async () => {
  const worker = await loadWorker();
  const response = await search(worker, {
    query: "Cari klinik maksimal 3 menit dari Stasiun Dukuh Atas",
  });

  assert.equal(response.status, 200);
  const body = await response.json();

  assert.deepEqual(body.results, []);
  assert.equal(body.execution.tool.resultCount, 0);
  assert.match(body.explanation, /Tidak ada kandidat/);
});

test("rejects an invalid search request", async () => {
  const worker = await loadWorker();
  const response = await search(worker, { query: "x" });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
});

test("rejects unsupported content types", async () => {
  const worker = await loadWorker();
  const response = await rawSearch(worker, {
    body: JSON.stringify({ query: "Cari kopi dekat stasiun" }),
    headers: { "content-type": "text/plain" },
  });

  assert.equal(response.status, 415);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("rejects cross-origin API requests", async () => {
  const worker = await loadWorker();
  const response = await rawSearch(worker, {
    body: JSON.stringify({ query: "Cari kopi dekat stasiun" }),
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.invalid",
    },
  });

  assert.equal(response.status, 403);
});

test("rejects oversized request bodies", async () => {
  const worker = await loadWorker();
  const response = await rawSearch(worker, {
    body: JSON.stringify({ query: "x".repeat(3_000) }),
    headers: { "content-type": "application/json" },
  });

  assert.equal(response.status, 413);
});
