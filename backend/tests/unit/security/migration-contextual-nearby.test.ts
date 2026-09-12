import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260911150000_contextual_merchant_nearby.sql"),
  "utf8",
);

describe("contextual merchant nearby migration", () => {
  it("filters and orders nearby merchants inside PostGIS with a bounded page", () => {
    expect(sql).toContain("using gist ((location::geography))");
    expect(sql).toContain("extensions.st_dwithin");
    expect(sql).toContain("extensions.st_distance");
    expect(sql).toContain("p_radius_meters between 250 and 3000");
    expect(sql).toContain("limit greatest(1, least(coalesce(p_limit, 50), 100))");
    expect(sql).not.toMatch(/execute\s+format/i);
  });

  it("keeps the definer RPC private to the backend service role", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
  });
});
