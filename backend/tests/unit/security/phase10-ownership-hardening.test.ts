import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

describe("Phase 10 merchant ownership hardening", () => {
  it("does not grant ownership or auto-approve a claim from the public claim route", () => {
    const source = readFileSync(resolve(root, "app/api/merchants/[id]/ownership/route.ts"), "utf8");
    expect(source).not.toMatch(/update\s*\(\s*\{\s*owner_id/);
    expect(source).not.toMatch(/instant_developer_claim/);
    expect(source).not.toMatch(/status:\s*["']APPROVED["']/);
    expect(source).toMatch(/status:\s*["']PENDING["']/);
  });

  it("does not expose claimable merchants or an instant-bind mutation", () => {
    const source = readFileSync(resolve(root, "app/api/umkm/advertising/my-merchants/route.ts"), "utf8");
    expect(source).toMatch(/recommendedMerchants:\s*\[\]/);
    expect(source).not.toMatch(/export\s+const\s+POST/);
    expect(source).not.toMatch(/owner_id:\s*user\.id/);
  });

  it("does not use stakeholder mode as the workspace authorization boundary", () => {
    const source = readFileSync(resolve(root, "app/api/umkm/workspace/route.ts"), "utf8");
    expect(source).not.toMatch(/requireStakeholderMode/);
    expect(source).not.toMatch(/stakeholder_mode/);
  });

  it("includes approved claims in the authorized workspace selector", () => {
    const source = readFileSync(resolve(root, "src/features/umkm-workspace/services/umkm-workspace.service.ts"), "utf8");
    expect(source).toMatch(/from\(["']merchant_claims["']\)/);
    expect(source).toMatch(/eq\(["']status["'],\s*["']APPROVED["']\)/);
    expect(source).toMatch(/new Map/);
    expect(source).not.toMatch(/stakeholder_mode/);
  });
});
