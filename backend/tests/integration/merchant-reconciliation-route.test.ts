import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  createMerchantReconciliationHandlers,
  type MerchantReconciliationRouteDependencies,
} from "@/app/api/admin/merchant-reconciliation/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const report = {
  algorithm_version: "merchant-reconciliation-v1",
  started_at: "2026-08-27T10:00:00.000Z",
  finished_at: "2026-08-27T10:00:01.000Z",
  premium_input: 200,
  menu_go_input: 87,
  confirmed: 1,
  high_confidence: 2,
  review_required: 3,
  no_match: 81,
  canonical_merchants_created: 84,
  canonical_merchants_reused: 3,
  source_links_upserted: 287,
};

function dependencies(
  authorize: MerchantReconciliationRouteDependencies["authorize"] =
    vi.fn().mockResolvedValue({ accountRole: "ADMIN", userId: "admin-id" }),
) {
  const service = {
    getSummary: vi.fn().mockResolvedValue({ total: 87 }),
    reconcile: vi.fn().mockResolvedValue(report),
  };
  return {
    handlers: createMerchantReconciliationHandlers({ authorize, createService: () => service }),
    service,
  };
}

function request(method: "GET" | "POST") {
  return new NextRequest("http://localhost/api/admin/merchant-reconciliation", { method });
}

describe("merchant reconciliation admin route", () => {
  it.each([["UNAUTHORIZED", 401], ["FORBIDDEN", 403]] as const)(
    "rejects %s callers before reconciliation",
    async (code, status) => {
      const fixture = dependencies(vi.fn().mockRejectedValue(new ApplicationError(code)));
      const response = await fixture.handlers.POST(request("POST"));
      expect(response.status).toBe(status);
      expect(fixture.service.reconcile).not.toHaveBeenCalled();
    },
  );

  it("allows ADMIN and returns only a safe auditable report", async () => {
    const fixture = dependencies();
    const response = await fixture.handlers.POST(request("POST"));
    const body = await response.json();
    const serialized = JSON.stringify(body);
    expect(response.status).toBe(200);
    expect(body.data).toEqual(report);
    expect(serialized).not.toContain("x-api-key");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("raw_payload");
  });

  it("returns aggregate review status to ADMIN", async () => {
    const fixture = dependencies();
    const response = await fixture.handlers.GET(request("GET"));
    expect(response.status).toBe(200);
    expect((await response.json()).data.total).toBe(87);
  });
});

