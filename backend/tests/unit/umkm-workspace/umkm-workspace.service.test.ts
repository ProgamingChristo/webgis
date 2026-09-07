import { beforeEach, describe, expect, it, vi } from "vitest";
import { UmkmWorkspaceService } from "@/src/features/umkm-workspace/services/umkm-workspace.service";

// Executes the service's owner filters, ordering and pagination against fixture rows.
function database(tables: Record<string, any[]>, failedTable?: string) {
  const ranges: Array<{ table: string; from: number }> = [];
  const client = { from: vi.fn((table: string) => {
    let rows = [...(tables[table] ?? [])];
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: string) => { rows = rows.filter((row) => row[key] === value); return query; }),
      in: vi.fn((key: string, values: string[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; }),
      order: vi.fn((key: string) => { if (key !== "id") rows.sort((a, b) => String(b[key]).localeCompare(String(a[key]))); return query; }),
      range: vi.fn((from: number, to: number) => { ranges.push({ table, from }); rows = rows.slice(from, to + 1); return query; }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: table === failedTable ? { message: "unavailable" } : null }).then(resolve),
    };
    return query;
  }) };
  return { service: new UmkmWorkspaceService(client as any), ranges };
}

const merchant = (id: string, owner = "owner") => ({ id, owner_id: owner, name: `Usaha ${id}`, address: null, description: null, metadata: { category: "Kuliner" }, publish_status: "PUBLISHED", verification_status: "VERIFIED" });
const submission = (id: string, status: string, updated = "2026-08-01") => ({ id, submitted_by: "owner", name: `Pendaftaran ${id}`, category: "Kuliner", status, address: null, created_at: updated, updated_at: updated });
const claim = (status: string) => ({ id: "claim-1", merchant_id: "external", user_id: "owner", status, note: null, created_at: "2026-08-01", reviewed_at: null });

describe("UmkmWorkspaceService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns NO_MERCHANT inputs when there are no owned businesses or workflows", async () => {
    const { service } = database({ merchants: [merchant("other", "someone-else")] });
    expect(await service.getWorkspaceSummary("owner")).toEqual({ verified_merchants_count: 0, pending_submissions_count: 0, active_campaigns_count: 0, owned_merchants: [], recent_claims: [], recent_submissions: [] });
  });

  it("keeps active campaign counts scoped to each owned merchant", async () => {
    const { service } = database({ merchants: [merchant("one"), merchant("two"), merchant("private", "someone-else")], ad_campaigns: [
      { id: "a", merchant_id: "one", status: "ACTIVE" }, { id: "b", merchant_id: "one", status: "PAUSED" },
      { id: "c", merchant_id: "two", status: "DRAFT" }, { id: "d", merchant_id: "private", status: "ACTIVE" },
    ] });
    const summary = await service.getWorkspaceSummary("owner");
    expect(summary.active_campaigns_count).toBe(1);
    expect(summary.owned_merchants).toEqual([
      expect.objectContaining({ id: "one", campaigns_count: 2, active_campaigns_count: 1, category: "Kuliner" }),
      expect.objectContaining({ id: "two", campaigns_count: 1, active_campaigns_count: 0 }),
    ]);
  });

  it.each(["PENDING", "APPROVED"])("a %s claim without owner_id never grants workspace access", async (status) => {
    const { service } = database({ merchants: [merchant("external", "someone-else")], merchant_claims: [claim(status)] });
    const summary = await service.getWorkspaceSummary("owner");
    expect(summary.owned_merchants).toEqual([]);
    expect(summary.recent_claims[0]).toMatchObject({ merchant_name: "Usaha external", status });
    expect(summary.pending_submissions_count).toBe(status === "PENDING" ? 1 : 0);
  });

  it("reads the category_label stored by registration approval before description", async () => {
    const approved = { ...merchant("approved"), metadata: { category_label: "Makanan & Minuman" }, description: "Deskripsi panjang usaha" };
    const { service } = database({ merchants: [approved] });
    expect((await service.getWorkspaceSummary("owner")).owned_merchants[0]!.category).toBe("Makanan & Minuman");
  });
  it("paginates owned businesses and campaigns instead of reporting a truncated total", async () => {
    const { service, ranges } = database({ merchants: Array.from({ length: 101 }, (_, index) => merchant(`owner-${index}`)), ad_campaigns: Array.from({ length: 102 }, (_, index) => ({ id: `campaign-${index}`, merchant_id: "owner-0", status: "ACTIVE" })) });
    const summary = await service.getWorkspaceSummary("owner");
    expect(summary.owned_merchants).toHaveLength(101);
    expect(summary.owned_merchants[0]!.active_campaigns_count).toBe(102);
    expect(summary.active_campaigns_count).toBe(102);
    expect(ranges).toContainEqual({ table: "merchants", from: 100 });
    expect(ranges).toContainEqual({ table: "ad_campaigns", from: 100 });
  });

  it("retains old pending claims and submissions plus drafts beyond recent history and page boundaries", async () => {
    const history = Array.from({ length: 105 }, (_, index) => submission(`closed-${index}`, "APPROVED", "2026-09-01"));
    const { service, ranges } = database({ merchants: [merchant("external", "other")], merchant_submissions: [...history, submission("pending", "PENDING_REVIEW"), submission("draft", "DRAFT")], merchant_claims: [
      ...Array.from({ length: 15 }, (_, index) => ({ ...claim("REJECTED"), id: `closed-${index}`, created_at: "2026-09-01" })), claim("PENDING"),
    ] });
    const summary = await service.getWorkspaceSummary("owner");
    expect(summary.recent_submissions).toHaveLength(12);
    expect(summary.recent_submissions).toEqual(expect.arrayContaining([expect.objectContaining({ id: "pending" }), expect.objectContaining({ id: "draft" })]));
    expect(summary.recent_claims).toHaveLength(11);
    expect(summary.recent_claims).toEqual(expect.arrayContaining([expect.objectContaining({ status: "PENDING" })]));
    expect(summary.pending_submissions_count).toBe(3);
    expect(ranges).toContainEqual({ table: "merchant_submissions", from: 100 });
  });

  it.each(["merchant_submissions", "merchant_claims", "ad_campaigns"])("does not turn a failed %s query into empty/zero state", async (failedTable) => {
    const { service } = database({ merchants: [merchant("one")] }, failedTable);
    await expect(service.getWorkspaceSummary("owner")).rejects.toThrow("Gagal mengambil");
  });

  it("refreshes actual ownership after approval while preserving other pending workflows", async () => {
    const tables = { merchants: [merchant("external", "someone-else")], merchant_claims: [claim("PENDING")], merchant_submissions: [submission("another", "PENDING_REVIEW")] };
    const { service } = database(tables);
    expect((await service.getWorkspaceSummary("owner")).owned_merchants).toHaveLength(0);
    tables.merchants[0]!.owner_id = "owner";
    tables.merchant_claims[0]!.status = "APPROVED";
    const summary = await service.getWorkspaceSummary("owner");
    expect(summary.owned_merchants[0]!.id).toBe("external");
    expect(summary.pending_submissions_count).toBe(1);
  });
});
