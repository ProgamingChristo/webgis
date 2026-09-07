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
    expect(source).toMatch(/claimStatus:\s*["']PENDING["']/);
    expect(source).toMatch(/rpc\(["']submit_merchant_claim["']/);
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

  it("uses canonical owner_id rather than claim history as active workspace authority", () => {
    const source = readFileSync(resolve(root, "src/features/umkm-workspace/services/umkm-workspace.service.ts"), "utf8");
    expect(source).toMatch(/readWorkflowRows\(["']merchant_claims["']/);
    expect(source).toMatch(/eq\(["']owner_id["'],\s*userId\)/);
    expect(source).not.toMatch(/approvedClaims/);
    expect(source).not.toMatch(/claimedMerchants/);
    expect(source).not.toMatch(/stakeholder_mode/);
  });

  it("makes approval atomic and assigns ownership to claimant, never reviewer", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260901090000_merchant_claim_ownership_authority.sql"),
      "utf8",
    );
    expect(migration).toMatch(/FROM public\.merchant_claims WHERE id = claim_id FOR UPDATE/i);
    expect(migration).toMatch(/SET owner_id = claim_record\.user_id/i);
    expect(migration).not.toMatch(/SET owner_id = reviewer_id/i);
    expect(migration).toMatch(/reviewed_by = reviewer_id/i);
    expect(migration).toMatch(/claim_record\.user_id = reviewer_id/i);
    expect(migration).toMatch(/Self approval is not allowed/i);
    expect(migration).toMatch(/MERCHANT_OWNERSHIP_ACTIVATED/);
  });

  it("prevents duplicate pending claims and reconciles only unambiguous approved claims", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260901090000_merchant_claim_ownership_authority.sql"),
      "utf8",
    );
    expect(migration).toMatch(/UNIQUE INDEX IF NOT EXISTS merchant_claims_one_pending_per_claimant/i);
    expect(migration).toMatch(/WHERE status = 'PENDING'/i);
    expect(migration).toMatch(/candidate\.claimant_count = 1/i);
    expect(migration).toMatch(/MERCHANT_OWNERSHIP_RECONCILIATION_REQUIRED/);
  });

  it("requires structured evidence and derives claimant from auth context", () => {
    const schema = readFileSync(resolve(root, "src/features/merchant-ownership/schemas/merchant-ownership.schema.ts"), "utf8");
    const route = readFileSync(resolve(root, "app/api/merchants/[id]/ownership/route.ts"), "utf8");
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260901090000_merchant_claim_ownership_authority.sql"),
      "utf8",
    );
    expect(schema).toMatch(/contactName/);
    expect(schema).toMatch(/contactPhone/);
    expect(schema).toMatch(/statement/);
    expect(route).toMatch(/createClaimSchema\.safeParse/);
    expect(migration).toMatch(/claimant_id uuid := auth\.uid\(\)/);
    expect(route).not.toMatch(/user_id:\s*body/);
  });

  it("keeps merchant claim review behind ADMIN routes and endpoint policies", () => {
    const listRoute = readFileSync(resolve(root, "app/api/admin/merchant-claims/route.ts"), "utf8");
    const approveRoute = readFileSync(resolve(root, "app/api/admin/merchant-claims/[id]/approve/route.ts"), "utf8");
    const rejectRoute = readFileSync(resolve(root, "app/api/admin/merchant-claims/[id]/reject/route.ts"), "utf8");
    const endpointPolicies = readFileSync(resolve(root, "src/lib/api-security/endpoint-policy.ts"), "utf8");

    for (const route of [listRoute, approveRoute, rejectRoute]) {
      expect(route).toMatch(/requireRole\(req,\s*["']ADMIN["']\)/);
    }
    expect(endpointPolicies).toMatch(/path:\s*["']\/api\/admin\/merchant-claims["']/);
    expect(endpointPolicies).toMatch(/path:\s*["']\/api\/admin\/merchant-claims\/\[id\]\/approve["']/);
    expect(endpointPolicies).toMatch(/path:\s*["']\/api\/admin\/merchant-claims\/\[id\]\/reject["']/);
  });
});
