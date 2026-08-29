import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828090000_phase05_global_search_regions.sql"),
  "utf8",
);

describe("Phase 05 global search migration", () => {
  it("loads trusted region geometry and keeps search parameterized and bounded", () => {
    expect(sql).toContain("GADM v4.0");
    expect(sql).toContain("geometry extensions.geometry(MultiPolygon, 4326)");
    expect(sql).toContain("using gist (geometry)");
    expect(sql).toContain("extensions.st_intersects");
    expect(sql).toContain("search_canonical_merchants_v1");
    expect(sql).toContain("limit greatest(1, least(coalesce(p_limit, 50), 100))");
    expect(sql).not.toMatch(/execute\s+format/i);
    expect(sql).not.toMatch(/drop\s+table|truncate\s+/i);
  });

  it("keeps region and search RPCs service-role only", () => {
    expect(sql).toContain("revoke all on table public.administrative_regions from anon, authenticated");
    expect(sql.match(/to service_role/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
