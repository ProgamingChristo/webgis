import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260831110000_global_canonical_merchant_search.sql"),
  "utf8",
);

describe("global canonical merchant search migration", () => {
  it("allows keyword discovery without requiring viewport or region eligibility", () => {
    expect(sql).toContain("input.bbox_parts = 0");
    expect(sql).toContain("input.keyword is not null");
    expect(sql).toContain("idx_merchants_published_name_search");
    expect(sql).toContain("pg_trgm");
    expect(sql).toContain("gin_trgm_ops");
    expect(sql).toContain("limit greatest(1, least(coalesce(p_limit, 50), 100))");
    expect(sql).not.toMatch(/execute\s+format|drop\s+table|truncate\s+/i);
  });

  it("keeps the canonical search RPC service-role only", () => {
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });
});
