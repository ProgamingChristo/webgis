import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const service = readFileSync(resolve(root, "src/features/umkm-intelligence/services/umkm-intelligence.service.ts"), "utf8");
const hook = readFileSync(resolve(root, "src/features/umkm-intelligence/hooks/use-umkm-intelligence.ts"), "utf8");
const explanation = readFileSync(resolve(root, "src/features/umkm-intelligence/hooks/use-umkm-insight-explanation.ts"), "utf8");
const map = readFileSync(resolve(root, "src/features/umkm-intelligence/components/umkm-intelligence-map.tsx"), "utf8");

describe("UMKM intelligence integration contract", () => {
  it("uses only GETRA-owned intelligence endpoints", () => {
    expect(service).toMatch(/\/api\/umkm\/intelligence/);
    expect(service).not.toMatch(/maps\.mapid|\/web\/competition|x-api-key|service.role/i);
  });

  it("isolates asynchronous results by merchant and observation window", () => {
    expect(hook).toContain('`${merchantId}:${days}`');
    expect(hook).toContain("result?.key === key");
    expect(hook).toContain("data.merchant.id !== merchantId");
    expect(hook).toMatch(/AbortController/);
    expect(hook).toMatch(/sequence\.current === requestId/);
  });

  it("scopes contextual explanations and rejects responses for another merchant", () => {
    expect(explanation).toContain('`${merchantId}:${days}`');
    expect(explanation).toContain("state?.key === key");
    expect(explanation).toContain("data.evidence.merchant_id !== merchantId");
    expect(explanation).toContain("controller.signal.aborted");
  });

  it("reuses bounded merchant and network map evidence", () => {
    expect(map).toMatch(/nearby_similar_merchants/);
    expect(map).toMatch(/nearest_transit/);
    expect(map).not.toMatch(/\/web\/competition|x-api-key|service.role/i);
  });
});
